"use client";
import { useEffect,useRef } from "react";
import { Icon } from "./icons";
export function PhotoDialog({photo,onClose}:{photo:{name:string;dataUrl:string}|null;onClose:()=>void}){
  const dialog=useRef<HTMLDialogElement>(null);
  useEffect(()=>{if(photo&&!dialog.current?.open)dialog.current?.showModal();if(!photo&&dialog.current?.open)dialog.current.close();},[photo]);
  return <dialog ref={dialog} className="photo-dialog" onCancel={onClose} onClick={e=>{if(e.target===e.currentTarget)onClose();}}>
    {photo?<><button className="lightbox-close" aria-label="Close photo" onClick={onClose}><Icon name="close"/></button><img src={photo.dataUrl} alt={photo.name}/><p>{photo.name}</p></>:null}
  </dialog>;
}
