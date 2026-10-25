import { Injectable } from "@nestjs/common";
import { type IUiPlugin, type UiPluginManifest } from "@rad-ar/plugin";
import {
  isOperatorUiEnabled,
  OPERATOR_UI_MANIFEST,
} from "./operator-ui.manifest";

@Injectable()
export class OperatorUiPlugin implements IUiPlugin {
  readonly manifest: UiPluginManifest = OPERATOR_UI_MANIFEST;

  isEnabled(environment: NodeJS.ProcessEnv = process.env): boolean {
    return isOperatorUiEnabled(environment.RADAR_UI_OPERATOR);
  }
}
