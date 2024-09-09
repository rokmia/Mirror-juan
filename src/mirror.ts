import { containsOnlyAttachments, isGif } from "./utils";
import { MirrorReplacements, ReplacementConfig } from "./replacements";
import { FilterConfig, MirrorFilters } from "./filters";
import {
  Message,
  MessageEmbed,
  MessagePayload,
  WebhookClient,
  WebhookMessageOptions,
} from "discord.js-selfbot-v13";

interface MirrorConfigRequirements {
  minEmbedsCount?: number;
  minContentLength?: number;
  minAttachmentsCount?: number;
}

class MirrorRequirements {
  public minEmbedsCount: number;
  public minContentLength: number;
  public minAttachmentsCount: number;

  public constructor({
    minEmbedsCount = 0,
    minContentLength = 0,
    minAttachmentsCount = 0,
  }: MirrorConfigRequirements) {
    this.minEmbedsCount = minEmbedsCount;
    this.minContentLength = minContentLength;
    this.minAttachmentsCount = minAttachmentsCount;
  }
}

interface MirrorConfigOptions {
  useWebhookProfile?: boolean;
  removeAttachments?: boolean;
  mirrorMessagesFromBots?: boolean;
  mirrorReplyMessages?: boolean;
  mirrorMessagesOnEdit?: boolean;
}

class MirrorOptions {
  public useWebhookProfile: boolean;
  public removeAttachments: boolean;
  public mirrorMessagesFromBots: boolean;
  public mirrorReplyMessages: boolean;
  public mirrorMessagesOnEdit: boolean;

  public constructor({
    useWebhookProfile = false,
    removeAttachments = false,
    mirrorMessagesFromBots = true,
    mirrorReplyMessages = true,
    mirrorMessagesOnEdit = false,
  }: MirrorConfigOptions) {
    this.useWebhookProfile = useWebhookProfile;
    this.removeAttachments = removeAttachments;
    this.mirrorMessagesFromBots = mirrorMessagesFromBots;
    this.mirrorReplyMessages = mirrorReplyMessages;
    this.mirrorMessagesOnEdit = mirrorMessagesOnEdit;
  }
}

export interface MirrorConfig {
  channelIds?: string[];
  webhookUrls?: string[];
  requirements?: MirrorConfigRequirements;
  options?: MirrorConfigOptions;
  replacements?: Record<number, ReplacementConfig>;
  filters?: Record<number, FilterConfig>;
}

export class Mirror {
  private webhooks: WebhookClient[] = [];
  private mirrorRequirements: MirrorRequirements;
  private mirrorOptions: MirrorOptions;
  private replacements: MirrorReplacements;
  private filters: MirrorFilters;

  public constructor({
    webhookUrls = [],
    requirements = {},
    options = {},
    replacements = {},
    filters = {},
  }: MirrorConfig) {
    this.loadWebhooks(webhookUrls);
    this.mirrorRequirements = new MirrorRequirements(requirements);
    this.mirrorOptions = new MirrorOptions(options);
    this.replacements = new MirrorReplacements(replacements);
    this.filters = new MirrorFilters(filters);
  }

  public shouldMirror(message: Message, isUpdate: boolean): boolean {
    return (
      this.messageMeetsOptions(message, isUpdate) &&
      this.messageMeetsRequirements(message) &&
      this.messageMatchFilters(message) &&
      this.stripMessage(message)
    );
  }

  public applyReplacements(message: Message): void {
    this.replacements.apply(message);
  }

  public dispatchMessage(
    message: Message,
    callback: (message: Message) => void
  ): void {
    const payloads = this.createMessagePayloads(message);

    for (const webhook of this.webhooks) {
      for (const payload of payloads) {
        webhook
          .send(payload)
          .then(() => callback(message))
          .catch((error) => console.error(error));
      }
    }
  }

  private createMessagePayloads(
    message: Message
  ): (MessagePayload | WebhookMessageOptions)[] {
    const maxContentLength = 2000;

    const payloads: (MessagePayload | WebhookMessageOptions)[] = [];
    const payload: MessagePayload | WebhookMessageOptions = {
      content: message.content.length
        ? message.content.substring(0, maxContentLength)
        : undefined,
      files: [...message.attachments.values()],
      embeds: this.fixInvalidEmbeds(message),
    };
    if (!this.mirrorOptions.useWebhookProfile) {
      payload.username = message.author.username;
      payload.avatarURL = message.author.avatarURL() ?? undefined;
    }
    payloads.push(payload);

    const chunks = Math.floor(message.content.length / (maxContentLength + 1));
    for (let i = 0; i < chunks; i++) {
      const payload: MessagePayload | WebhookMessageOptions = {
        content: message.content.substring(
          (i + 1) * maxContentLength,
          (i + 2) * maxContentLength
        ),
      };
      if (!this.mirrorOptions.useWebhookProfile) {
        payload.username = message.author.username;
        payload.avatarURL = message.author.avatarURL() ?? undefined;
      }
      payloads.push(payload);
    }
    return payloads;
  }

  private fixInvalidEmbeds(message: Message): MessageEmbed[] {
    for (const embed of message.embeds) {
      for (const field of embed.fields) {
        if (!field.name.length) {
          field.name = "\u200B";
        }
        if (!field.value.length) {
          field.value = "\u200B";
        }
      }
    }
    return message.embeds;
  }

  private messageMeetsOptions(message: Message, isUpdate: boolean): boolean {
    return (
      (this.mirrorOptions.mirrorMessagesFromBots || !message.author.bot) &&
      (this.mirrorOptions.mirrorReplyMessages || !message.reference) &&
      (this.mirrorOptions.mirrorMessagesOnEdit || !isUpdate)
    );
  }

  private messageMeetsRequirements(message: Message): boolean {
    return (
      message.content.length >= this.mirrorRequirements.minContentLength &&
      message.embeds.length >= this.mirrorRequirements.minEmbedsCount &&
      message.attachments.size >= this.mirrorRequirements.minAttachmentsCount
    );
  }

  private messageMatchFilters(message: Message): boolean {
    return this.filters.match(message);
  }

  private stripMessage(message: Message): boolean {
    if (this.mirrorOptions.removeAttachments) {
      if (containsOnlyAttachments(message)) {
        return false;
      }
      message.attachments.clear();
    }
    if (isGif(message)) {
      message.embeds.pop();
    }
    return true;
  }

  private loadWebhooks(webhookUrls: string[]): void {
    for (const webhookUrl of webhookUrls) {
      this.webhooks.push(new WebhookClient({ url: webhookUrl }));
    }
  }
}
