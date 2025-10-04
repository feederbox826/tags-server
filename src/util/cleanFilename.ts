// win-1252 conversion from https://stackoverflow.com/a/73127563
export const cleanFileName = (filename: string) =>
  filename
    .trim()
    .replace(/\./g, "")
    .replace(/\:/g, "-")
    .replace(/ |\/|\\/g, "_")
    .replace(/%u(....)/g, (_,p)=>String.fromCharCode(Number("0x"+p)))
    .replace(/%(..)/g, (_,p)=>String.fromCharCode(Number("0x"+p)))