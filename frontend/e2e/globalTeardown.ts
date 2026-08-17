import { stopCircuit } from './globalSetup';

/** Убрать за собой: сервер контура гаснет, его база сносится. */
export default function globalTeardown() {
  stopCircuit();
}
