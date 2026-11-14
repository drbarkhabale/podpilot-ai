export type DeviceFeature='camera'|'microphone';
type Policy={allowsFeature:(feature:string)=>boolean};
export function inspectDeviceAccess(feature:DeviceFeature){
 const embedded=window.self!==window.top;
 const doc=document as Document&{permissionsPolicy?:Policy;featurePolicy?:Policy};
 const policy=doc.permissionsPolicy||doc.featurePolicy;
 let policyBlocked=false;try{policyBlocked=policy?.allowsFeature(feature)===false;}catch{/* Unsupported inspection is not evidence of denial. */}
 return {embedded,policyBlocked};
}
export function permissionMessage(feature:DeviceFeature,embedded:boolean,policyBlocked:boolean){
 const name=feature==='camera'?'Camera':'Microphone';
 if(policyBlocked)return `${name} access is blocked by this window’s permissions policy. Open the standalone studio in a new tab, then enable ${feature} there. Browser permission changes cannot override an embedding window’s policy.`;
 if(embedded)return `${name} access was blocked. This embedded Sites window may not allow device access. Open the standalone studio in a new tab and try again; allow ${feature} when your browser asks.`;
 return `${name} access was blocked or not granted. In this tab’s address-bar site controls, allow ${feature} for PodPilot, then retry. Also check your operating system’s camera/microphone permission for this browser.`;
}
export function assertDevicePolicy(feature:DeviceFeature){const state=inspectDeviceAccess(feature);if(state.policyBlocked)throw new Error(permissionMessage(feature,state.embedded,true));}
