#!/usr/bin/env bash
set -euo pipefail

REPOSITORY="barrcodes/xiv-megaphone"
APP_NAME="xiv-megaphone"

if [[ "$(uname -m)" != "x86_64" ]]; then
  echo "xiv-megaphone AppImage currently supports x86_64 only (found $(uname -m))." >&2
  exit 1
fi

for command in curl python3; do
  if ! command -v "$command" >/dev/null 2>&1; then
    echo "Required command not found: $command" >&2
    exit 1
  fi
done

absolute_path() {
  python3 - "$1" <<'PY'
import os, sys
print(os.path.abspath(os.path.expanduser(sys.argv[1])))
PY
}

home_dir="$(absolute_path "$HOME")"
data_home="${XDG_DATA_HOME:-$home_dir/.local/share}"
if [[ "$data_home" != /* ]]; then
  data_home="$home_dir/.local/share"
fi
data_home="$(absolute_path "$data_home")"
applications_dir="$data_home/applications"
icons_dir="$data_home/icons/hicolor/256x256/apps"
install_dir="$(absolute_path "$home_dir/Applications")"
mkdir -p "$applications_dir" "$icons_dir" "$install_dir"
temporary_dir="$(mktemp -d "$install_dir/.xiv-megaphone-install.XXXXXX")"
trap 'rm -rf "$temporary_dir"' EXIT

metadata="$temporary_dir/latest-linux.yml"
curl --fail --location --silent --show-error \
  "https://github.com/$REPOSITORY/releases/latest/download/latest-linux.yml" -o "$metadata"

release_fields="$(python3 - "$metadata" <<'PY'
import re, sys
text = open(sys.argv[1], encoding="utf-8").read()
version = re.search(r"(?m)^version:\s*['\"]?([0-9]+\.[0-9]+\.[0-9]+[^\s'\"]*)\s*$", text)
urls = re.findall(r"(?m)^\s*-\s+url:\s*['\"]?([^\s'\"]+)", text)
paths = re.findall(r"(?m)^path:\s*['\"]?([^\s'\"]+)", text)
digests = re.findall(r"(?m)^\s*sha512:\s*['\"]?([A-Za-z0-9+/=]+)\s*$", text)
sizes = re.findall(r"(?m)^\s*size:\s*(\d+)\s*$", text)
expected = "xiv-megaphone-linux-x64.AppImage"
if not version:
    raise SystemExit("latest-linux.yml has no valid version")
if urls != [expected] or paths != [expected]:
    raise SystemExit("latest-linux.yml does not name the expected x64 AppImage in url and path")
if len(digests) < 2 or digests[0] != digests[-1] or len(sizes) != 1 or int(sizes[0]) <= 0:
    raise SystemExit("latest-linux.yml has inconsistent AppImage SHA-512 or size metadata")
print("\t".join((version.group(1), expected, digests[0])))
PY
)"
IFS=$'\t' read -r version filename expected_digest <<< "$release_fields"
if [[ -z "$version" || "$filename" != "xiv-megaphone-linux-x64.AppImage" || -z "$expected_digest" ]]; then
  echo "Could not read a valid release version and AppImage checksum from latest-linux.yml." >&2
  exit 1
fi

download="$temporary_dir/$filename"
release_tag="v$version"
release_base="https://github.com/$REPOSITORY/releases/download/$release_tag"
curl --fail --location --silent --show-error "$release_base/$filename" -o "$download"
actual_digest="$(python3 - "$download" <<'PY'
import base64, hashlib, sys
digest = hashlib.sha512()
with open(sys.argv[1], "rb") as file:
    for chunk in iter(lambda: file.read(1024 * 1024), b""):
        digest.update(chunk)
print(base64.b64encode(digest.digest()).decode())
PY
)"
if [[ "$actual_digest" != "$expected_digest" ]]; then
  echo "SHA-512 verification failed for $release_tag/$filename; the installed app was not replaced." >&2
  exit 1
fi

icon_download="$temporary_dir/$APP_NAME.png"
curl --fail --location --silent --show-error \
  "https://raw.githubusercontent.com/$REPOSITORY/$release_tag/frontend/art-assets/icon-wake-256.png" \
  -o "$icon_download"

stable_appimage="$install_dir/$APP_NAME.AppImage"
desktop_temp="$temporary_dir/$APP_NAME.desktop"
python3 - "$stable_appimage" "$desktop_temp" "$icons_dir/$APP_NAME.png" <<'PY'
import sys

def escape_exec_arg(value):
    escaped = []
    for character in value:
        if character == "\\":
            escaped.append(r"\\\\")
        elif character in ('"', "$", "`"):
            escaped.append(r"\\" + character)
        elif character == "%":
            escaped.append("%%")
        elif character == "\n":
            escaped.append(r"\n")
        elif character == "\t":
            escaped.append(r"\t")
        elif character == "\r":
            escaped.append(r"\r")
        else:
            escaped.append(character)
    return "".join(escaped)

def escape_string(value):
    escaped = []
    for character in value:
        if character == "\\":
            escaped.append(r"\\")
        elif character == "\n":
            escaped.append(r"\n")
        elif character == "\t":
            escaped.append(r"\t")
        elif character == "\r":
            escaped.append(r"\r")
        else:
            escaped.append(character)
    return "".join(escaped)

appimage, desktop, icon = sys.argv[1:]
with open(desktop, "w", encoding="utf-8") as output:
    output.write("[Desktop Entry]\nType=Application\nName=xiv-megaphone\n")
    output.write('Exec="' + escape_exec_arg(appimage) + '" %U\n')
    output.write("Icon=" + escape_string(icon) + "\nTerminal=false\n")
    output.write("Categories=Utility;\nMimeType=x-scheme-handler/xiv-megaphone;\n")
PY

chmod 755 "$download"
mv -f "$download" "$stable_appimage"
mv -f "$icon_download" "$icons_dir/$APP_NAME.png"
mv -f "$desktop_temp" "$applications_dir/$APP_NAME.desktop"

if command -v update-desktop-database >/dev/null 2>&1; then
  if ! update-desktop-database "$applications_dir"; then
    echo "Warning: desktop database refresh failed. Run: update-desktop-database '$applications_dir'" >&2
  fi
else
  echo "Warning: update-desktop-database is unavailable; install desktop-file-utils to refresh desktop entries." >&2
fi

if command -v xdg-mime >/dev/null 2>&1; then
  if ! xdg-mime default "$APP_NAME.desktop" x-scheme-handler/xiv-megaphone; then
    echo "Warning: protocol registration failed. Run: xdg-mime default '$APP_NAME.desktop' x-scheme-handler/xiv-megaphone" >&2
  fi
else
  echo "Warning: xdg-mime is unavailable; install xdg-utils to register xiv-megaphone:// links." >&2
fi

echo "Installed xiv-megaphone $version at $stable_appimage"
echo "Launch it from your application menu or run: \"$stable_appimage\""
