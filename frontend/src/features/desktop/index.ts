export { DesktopFrame } from './DesktopFrame';
export { DesktopShell } from './DesktopShell';
export { OfflineScreen } from './OfflineScreen';
export { SettingsScreen } from './SettingsScreen';
export { useFrameControls } from './frameControls';
export { isDesktop, minimiseToTray, setTrayLabel, setTrayMenu, APP_VERSION } from './bridge';
export { forgetMachineKey, hasMachineKey, rememberMachineKey } from './machineKey';
export { cabinetFolder, chooseCabinetFolder, revealCabinetFolder } from './cabinetFolder';
export { measureUplink, PROBE_SECONDS, REQUIRED_MBPS } from './uplinkProbe';
export { SetupScreen } from './setup/SetupScreen';
export {
  canLeaveCabinetStep,
  canLeaveCheckStep,
  channelVerdict,
  countdown,
  formatPairingCode,
  SETUP_STEPS,
  stepFromNumber,
  stepNumber,
  type SetupStep,
} from './setup/firstRun';
export {
  connectionWord,
  hostState,
  meterLevel,
  showsHostBar,
  showsLessonTag,
  showsSwitchers,
  type ConnectionWord,
  type HostFacts,
  type HostState,
  type UplinkVerdict,
} from './hostState';
