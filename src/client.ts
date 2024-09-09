import { Mirror, MirrorConfig } from "./mirror";
import { Config } from "./config";
import {
  Client,
  Message,
  PartialMessage,
  PresenceStatusData,
  TextChannel,
} from "discord.js-selfbot-v13";
import {
  isDirectMessage,
  isEmptyMessage,
  isSystemMessage,
  isVisibleOnlyByClient,
  isPublishedMessage,
  getParentChannel,
} from "./utils";

type ChannelId = string;

export class MirrorClient extends Client {
  private config: Config;
  private mirrors: Map<ChannelId, Mirror> = new Map();

  public constructor(config: Config) {
    super({
      checkUpdate: false,
      presence: {
        status: config.getStatus() as PresenceStatusData,
      },
    });
    this.config = config;
    this.loadMirrors();

    this.on("ready", () => this.onReady());
    this.on("messageCreate", (message) => this.onMessageCreate(message));
    this.on("messageUpdate", (oldMessage, newMessage) => this.onMessageUpdate(oldMessage, newMessage));
  }

  private onReady(): void {
    console.log(`${this.user?.username} is now mirroring >:)!`);
  }

  private onMessageCreate(message: Message): void {
    this.mirrorMessage(message);
  }

  private onMessageUpdate(
    _oldMessage: Message | PartialMessage,
    newMessage: Message | PartialMessage
  ): void {
    if (!newMessage.partial) {
      this.mirrorMessage(newMessage, true);
    }
  }

  private mirrorMessage(message: Message, isUpdate: boolean = false): void {
    if (!this.isMirrorableMessage(message)) {
      return;
    }
    let mirror = this.getMirrorFromMessage(message);
    if (!mirror) {
      return;
    }
    if (!mirror.shouldMirror(message, isUpdate)) {
      return;
    }
    try {
      mirror.applyReplacements(message);
    } catch (error) {
      console.error(error);
    }
    mirror.dispatchMessage(message, () => this.logMirroredMessage(message));
  }

  private getMirrorFromMessage(message: Message): Mirror | undefined {
    let mirror = this.mirrors.get(message.channelId);
    if (mirror) {
      return mirror;
    }
    const parent = getParentChannel(message);
    if (parent) {
      return this.mirrors.get(parent.id);
    }
    return undefined;
  }

  private isMirrorableMessage(message: Message): boolean {
    return (
      !isSystemMessage(message) &&
      !isDirectMessage(message) &&
      !isVisibleOnlyByClient(message) &&
      !isEmptyMessage(message) &&
      !isPublishedMessage(message)
    );
  }

  private logMirroredMessage(message: Message): void {
    const logMessage = this.config.getLogMessage();
    if (!logMessage.length) {
      return;
    }
    console.log(
      logMessage
        .replace("%date%", new Date().toLocaleString())
        .replace("%author%", message.author.username)
        .replace("%server%", message.guild!.name)
        .replace("%channel%", (message.channel as TextChannel).name)
    );
  }

  private loadMirrors(): void {
    for (const mirrorConfig of this.config.getMirrors()) {
      this.loadMirror(mirrorConfig);
    }
  }

  private loadMirror(mirrorConfig: MirrorConfig): void {
    const channelIds = mirrorConfig.channelIds;
    if (!channelIds) {
      return;
    }
    const mirror = new Mirror(mirrorConfig);
    for (const channelId of channelIds) {
      this.mirrors.set(channelId, mirror);
    }
  }
}
