import { HttpError } from "./http";
export function validatePhoto(dataUrl: string) {
  const match=dataUrl.match(/^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/]+={0,2})$/);
  if(!match)throw new HttpError(400,"Choose a JPG, PNG or WebP photo.");
  const data=Buffer.from(match[2],"base64");
  if(data.length>2*1024*1024)throw new HttpError(400,"Please choose a photo under 2 MB.");
  const png=data.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]));
  const jpeg=data[0]===255&&data[1]===216&&data[2]===255;
  const webp=data.subarray(0,4).toString()==="RIFF"&&data.subarray(8,12).toString()==="WEBP";
  if(!((match[1]==="image/png"&&png)||(match[1]==="image/jpeg"&&jpeg)||(match[1]==="image/webp"&&webp)))
    throw new HttpError(400,"That file doesn't appear to be a supported photo.");
}
