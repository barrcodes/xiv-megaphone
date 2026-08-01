export type IpcMessageType = "Say" | "Cancel";
export type TextSource = "Chat" | "AddonTalk" | "AddonBattleTalk" | "None";

export interface VoicePreset {
  Name: string; // confusing, this is the gender
}

/**
 * Dalamud.Game.Text.XivChatType enum from Dalamud 15.0.3.0
 */
export enum XivChatType {
  None = 0,
  Debug = 1,
  Urgent = 2,
  Notice = 3,
  Say = 10,
  Shout = 11,
  TellOutgoing = 12,
  TellIncoming = 13,
  Party = 14,
  Alliance = 15,
  Ls1 = 16,
  Ls2 = 17,
  Ls3 = 18,
  Ls4 = 19,
  Ls5 = 20,
  Ls6 = 21,
  Ls7 = 22,
  Ls8 = 23,
  FreeCompany = 24,
  NoviceNetwork = 27,
  CustomEmote = 28,
  StandardEmote = 29,
  Yell = 30,
  CrossParty = 32,
  PvPTeam = 36,
  CrossLinkShell1 = 37,
  Damage = 41,
  Miss = 42,
  Action = 43,
  Item = 44,
  Healing = 45,
  GainBuff = 46,
  GainDebuff = 47,
  LoseBuff = 48,
  LoseDebuff = 49,
  GlamourNotifications = 54,
  Alarm = 55,
  Echo = 56,
  SystemMessage = 57,
  SystemError = 58,
  GatheringSystemMessage = 59,
  ErrorMessage = 60,
  NPCDialogue = 61,
  LootNotice = 62,
  Progress = 64,
  LootRoll = 65,
  Crafting = 66,
  Gathering = 67,
  NPCDialogueAnnouncements = 68,
  FreeCompanyAnnouncement = 69,
  FreeCompanyLoginLogout = 70,
  RetainerSale = 71,
  PeriodicRecruitmentNotification = 72,
  Sign = 73,
  RandomNumber = 74,
  NoviceNetworkSystem = 75,
  Orchestrion = 76,
  PvpTeamAnnouncement = 77,
  PvpTeamLoginLogout = 78,
  MessageBook = 79,
  GmTell = 80,
  GmSay = 81,
  GmShout = 82,
  GmYell = 83,
  GmParty = 84,
  GmFreeCompany = 85,
  GmLinkshell1 = 86,
  GmLinkshell2 = 87,
  GmLinkshell3 = 88,
  GmLinkshell4 = 89,
  GmLinkshell5 = 90,
  GmLinkshell6 = 91,
  GmLinkshell7 = 92,
  GmLinkshell8 = 93,
  GmNoviceNetwork = 94,
  CrossLinkShell2 = 101,
  CrossLinkShell3 = 102,
  CrossLinkShell4 = 103,
  CrossLinkShell5 = 104,
  CrossLinkShell6 = 105,
  CrossLinkShell7 = 106,
  CrossLinkShell8 = 107,
}

export interface IpcMessage {
  Type: IpcMessageType;
  Speaker: string | null;
  NpcId: number | null;
  Race: string | null;
  BodyType: string | null;
  Payload: string;
  PayloadTemplate: string;
  Voice: VoicePreset | null;
  StuttersRemoved: boolean;
  Source: TextSource;
  ChatType: XivChatType | null;
  Language: string | null;
  Volume?: number;
}
