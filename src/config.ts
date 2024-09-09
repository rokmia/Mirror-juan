import fs from "fs";
import yaml from "yaml";
import { MirrorConfig } from "./mirror";

export class Config {
  private token: string;
  private status: string;
  private logMessage: string;
  private mirrors: MirrorConfig[] = [];

  public constructor(path: string) {
    const file = fs.readFileSync(path, "utf-8");
    const config = yaml.parse(file);

    this.token = config.token;
    this.status = config.status;
    this.logMessage = config.logMessage;

    for (const key in config.mirrors) {
      const mirror = config.mirrors[key];
      this.mirrors.push(mirror);
    }
  }

  public getToken(): string {
    return this.token;
  }

  public getStatus(): string {
    return this.status;
  }

  public getLogMessage(): string {
    return this.logMessage;
  }

  public getMirrors(): MirrorConfig[] {
    return this.mirrors;
  }
}
