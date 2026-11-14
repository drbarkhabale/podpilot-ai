import {permissionMessage,type DeviceFeature} from './device-access';
export function explainDeviceError(error:unknown,kind:DeviceFeature,embedded:boolean,policyBlocked:boolean){const name=error instanceof Error?error.name:'';
 if(policyBlocked||name==='NotAllowedError'||name==='SecurityError')return permissionMessage(kind,embedded,policyBlocked);
 if(name==='NotFoundError')return `No ${kind} is available to this browser. Connect or enable it in your operating system, then retry. Remote browsers cannot access devices attached to your own computer.`;
 if(name==='NotReadableError'||name==='AbortError')return `Your ${kind} is busy or could not start. Close Zoom, Teams or another tab using it, check system permissions, and retry.`;
 if(name==='OverconstrainedError')return `The selected ${kind} is no longer available. Choose Default device and retry.`;
 return error instanceof Error?error.message:`Could not start ${kind}. Open the standalone studio and retry.`;}
