import {
  CategoryChannel,
  ForumChannel,
  Message,
  MessageFlags,
  NewsChannel,
  TextChannel,
  GuildChannel,
} from "discord.js-selfbot-v13";

export function getParentChannel(message: Message): CategoryChannel | NewsChannel | TextChannel | ForumChannel | null {
  return (message.channel instanceof GuildChannel) ? message.channel.parent ?? null : null;
}

export function isPublishedMessage(message: Message): boolean {
  return message.flags.has(MessageFlags.FLAGS.CROSSPOSTED);
}

export function isSystemMessage(message: Message): boolean {
  return message.system;
}

export function isDirectMessage(message: Message): boolean {
  return !message.guild;
}

export function isVisibleOnlyByClient(message: Message): boolean {
  return message.flags.has(MessageFlags.FLAGS.EPHEMERAL);
}

export function isEmptyMessage(message: Message): boolean {
  return !message.content.length && !message.embeds.length && !message.attachments.size;
}

export function isGif(message: Message): boolean {
  return message.embeds.length == 1 && message.embeds.at(0)?.provider != null;
}

export function containsOnlyAttachments(message: Message): boolean {
  return message.attachments.size > 0 && !message.content.length && !message.embeds.length;
}

export function isString(value: any): boolean {
  return typeof value === "string";
}

export function isValidHexColor(color: string): boolean {
  return /^#[0-9A-F]{6}$/i.test(color);
}

export function isWildcardRegex(regex: RegExp): boolean {
  return regex.source == "^(.|\\n)*";
}

export function hexColorsAreEqual(hexColorA: string, hexColorB: string, epsilon: number = 3000) {
  const colorA = parseInt(hexColorA.slice(1));
  const colorB = parseInt(hexColorB.slice(1));
  return Math.abs(colorA - colorB) <= epsilon;
}
