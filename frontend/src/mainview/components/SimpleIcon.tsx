interface SimpleIconProps {
  slug: string;
  className?: string;
}

export const SimpleIcon = ({ slug, className = "size-4" }: SimpleIconProps) => {
  const url = `https://cdn.simpleicons.org/${slug}`;

  return (
    <span
      aria-hidden="true"
      className={`${className} shrink-0 bg-current`}
      style={{
        mask: `url("${url}") center / contain no-repeat`,
        WebkitMask: `url("${url}") center / contain no-repeat`,
      }}
    />
  );
};
