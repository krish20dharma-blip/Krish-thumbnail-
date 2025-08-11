import React, { useRef, useState, useEffect } from 'react'
import { Stage, Layer, Image as KImage, Text as KText } from 'react-konva'

// Simple hook to load images from a data URL
function useImage(src){
  const [img, setImg] = useState(null)
  useEffect(()=>{
    if(!src) return setImg(null)
    const i = new window.Image()
    i.crossOrigin = 'anonymous'
    i.src = src
    i.onload = () => setImg(i)
    i.onerror = () => setImg(null)
  },[src])
  return img
}

// helper to try loading an image URL (returns Image object or throws)
function loadImageUrl(url){
  return new Promise((resolve, reject) => {
    const img = new window.Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = (e) => reject(e)
    img.src = url
  })
}

// extract YouTube video ID from many URL forms
function extractYouTubeId(input){
  if(!input) return null
  // direct id (11 chars typical) or URL
  const idMatch = input.match(/^[a-zA-Z0-9_-]{11}$/)
  if(idMatch) return idMatch[0]
  // common URL patterns
  const patterns = [
    /(?:youtube\.com\/(?:watch\?v=|embed\/|v\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/,
    /v=([a-zA-Z0-9_-]{11})/,
  ]
  for(const p of patterns){
    const m = input.match(p)
    if(m && m[1]) return m[1]
  }
  return null
}

// generate candidate thumbnail URLs (highest quality first)
function ytThumbUrls(videoId){
  return [
    `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`,
    `https://i.ytimg.com/vi/${videoId}/sddefault.jpg`,
    `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
    `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg`,
    `https://i.ytimg.com/vi/${videoId}/default.jpg`,
  ]
}

export default function Editor(){
  const stageRef = useRef()
  const fileRef = useRef()
  const [canvasSize, setCanvasSize] = useState({ width: 1280, height: 720 })
  const [layers, setLayers] = useState(()=>{
    try{
      const saved = localStorage.getItem('tc_layers')
      return saved ? JSON.parse(saved) : []
    }catch(e){
      return []
    }
  })
  const [selectedId, setSelectedId] = useState(null)

  // new state for youtube input
  const [youtubeInput, setYoutubeInput] = useState('')

  useEffect(()=>{
    try{ localStorage.setItem('tc_layers', JSON.stringify(layers)) }catch(e){}
  },[layers])

  // add image from file
  async function addImageFile(file){
    const src = await new Promise((res,rej)=>{
      const r = new FileReader()
      r.onload = ()=>res(r.result)
      r.onerror = rej
      r.readAsDataURL(file)
    })
    const id = 'id_'+Math.random().toString(36).slice(2,9)
    setLayers(s=>[...s, { id, type:'image', src, x:100, y:50, width:600, height:300, opacity:1, visible:true }])
    setSelectedId(id)
  }

  function addText(){
    const id = 'id_'+Math.random().toString(36).slice(2,9)
    setLayers(s=>[...s, { id, type:'text', text:'Your headline', x:60, y:60, fontSize:64, fill:'#fff', align:'left', visible:true }])
    setSelectedId(id)
  }

  function updateLayer(id, patch){
    setLayers(s=>s.map(l=>l.id===id?{...l,...patch}:l))
  }

  function removeLayer(id){
    setLayers(s=>s.filter(l=>l.id!==id))
    if(selectedId===id) setSelectedId(null)
  }

  function exportPNG(){
    try{
      const uri = stageRef.current.toDataURL({ pixelRatio: 1.5 })
      const a = document.createElement('a')
      a.href = uri; a.download = 'thumbnail.png'; a.click()
    }catch(e){
      alert('Export failed — possibly due to cross-origin images. Try a different image or use a proxy.')
    }
  }

  function onDrop(e){
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if(file) addImageFile(file)
  }

  function breakdown(){
    // draw stage to image then sample - simple approach
    const uri = stageRef.current.toDataURL()
    const img = new window.Image()
    img.src = uri
    img.onload = ()=>{
      const c = document.createElement('canvas')
      const w = 200
      const h = Math.round(img.height/img.width*w)
      c.width=w;c.height=h
      const ctx = c.getContext('2d')
      ctx.drawImage(img,0,0,w,h)
      const data = ctx.getImageData(0,0,w,h).data
      const counts={}
      for(let i=0;i<data.length;i+=8){
        const r=Math.round(data[i]/32)*32
        const g=Math.round(data[i+1]/32)*32
        const b=Math.round(data[i+2]/32)*32
        const k=`${r},${g},${b}`
        counts[k]=(counts[k]||0)+1
      }
      const top = Object.entries(counts).sort((a,b)=>b[1]-a[1]).slice(0,5).map(x=>x[0])
      alert('Top colors (approx):\n'+top.join('\n'))
    }
  }

  // NEW: add youtube thumbnail by trying multiple thumb urls
  async function addYouTubeThumbnail(input){
    const id = extractYouTubeId(input)
    if(!id){
      alert('Invalid YouTube link or id. Paste full URL or the 11-character video id.')
      return
    }
    const candidates = ytThumbUrls(id)
    let loaded = null
    for(const url of candidates){
      try{
        await loadImageUrl(url) // test load; will throw on error (including CORS)
        loaded = url
        break
      }catch(e){
        // continue to next candidate
      }
    }
    if(!loaded){
      alert('Could not load any thumbnail images for this video. It may be blocked by CORS or the video has no thumbnails.')
      return
    }
    const layerId = 'id_'+Math.random().toString(36).slice(2,9)
    // Use the direct URL as the src — crossOrigin was tested when loading above
    setLayers(s=>[...s, { id:layerId, type:'image', src:loaded, x:80, y:40, width:640, height:360, opacity:1, visible:true }])
    setSelectedId(layerId)
    setYoutubeInput('')
  }

  return (
    <div className="bg-white rounded p-4 shadow">
      <div className="flex gap-4">
        <div className="w-72">
          <div className="mb-3">
            <div className="border-dashed border-2 rounded p-3 text-center" onDrop={onDrop} onDragOver={(e)=>e.preventDefault()}>
              Drag & drop image here or <br/>
              <button className="mt-2 px-3 py-1 bg-slate-100 rounded" onClick={()=>fileRef.current.click()}>Choose file</button>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e)=>{ const f=e.target.files[0]; if(f) addImageFile(f); e.target.value=null }} />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex gap-2">
              <input className="flex-1 p-2 border rounded" placeholder="YouTube link or video id" value={youtubeInput} onChange={(e)=>setYoutubeInput(e.target.value)} />
              <button className="px-3 py-2 bg-indigo-600 text-white rounded" onClick={()=>addYouTubeThumbnail(youtubeInput)}>Add YouTube Thumbnail</button>
            </div>
            <div className="text-xs text-slate-500">Tries best available thumbnail (maxres → hq). If image is blocked by CORS, export may fail.</div>
            <button className="w-full px-3 py-2 bg-green-600 text-white rounded" onClick={addText}>Add Text</button>
            <button className="w-full px-3 py-2 bg-emerald-600 text-white rounded" onClick={exportPNG}>Export PNG</button>
            <button className="w-full px-3 py-2 border rounded" onClick={breakdown}>Breakdown</button>
          </div>

          <div className="mt-4">
            <h3 className="font-medium">Layers</h3>
            <div className="space-y-2 mt-2 max-h-56 overflow-auto">
              {layers.slice().reverse().map(l=> (
                <div key={l.id} className={`p-2 rounded border ${selectedId===l.id? 'border-blue-400':'border-slate-200'} bg-white flex items-center justify-between`} onClick={()=>setSelectedId(l.id)}>
                  <div>
                    <div className="text-sm font-medium">{l.type==='image' ? 'Image' : 'Text'}</div>
                    {l.type==='text' && <div className="text-xs text-slate-500">{l.text.slice(0,30)}</div>}
                  </div>
                  <div className="flex gap-1">
                    <button onClick={(e)=>{e.stopPropagation(); updateLayer(l.id,{visible:!l.visible})}} className="text-xs px-2 py-0.5 border rounded">{l.visible? 'Hide':'Show'}</button>
                    <button onClick={(e)=>{e.stopPropagation(); removeLayer(l.id)}} className="text-xs px-2 py-0.5 border rounded">Delete</button>
                  </div>
                </div>
              ))}
              {layers.length===0 && <div className="text-xs text-slate-500">No layers</div>}
            </div>
          </div>
        </div>

        <div className="flex-1">
          <div className="border rounded overflow-hidden mx-auto" style={{width: canvasSize.width/1.6, height: canvasSize.height/1.6}}>
            <Stage ref={stageRef} width={canvasSize.width} height={canvasSize.height} style={{background:'#111827'}}>
              <Layer>
                {/* background rect */}
                <KText text="" />
              </Layer>

              <Layer>
                {layers.map((l)=>{
                  if(l.type==='image'){
                    const img = useImage(l.src)
                    return img ? <KImage key={l.id} image={img} x={l.x} y={l.y} width={l.width} height={l.height} draggable onDragEnd={(e)=>updateLayer(l.id,{x:e.target.x(), y:e.target.y()})} /> : null
                  }
                  return <KText key={l.id} text={l.text} x={l.x} y={l.y} fontSize={l.fontSize} fill={l.fill} draggable onDblClick={()=>{ const val = prompt('Edit text', l.text); if(val!==null) updateLayer(l.id,{text:val}) }} onDragEnd={(e)=>updateLayer(l.id,{x:e.target.x(), y:e.target.y()})} />
                })}
              </Layer>
            </Stage>
          </div>

          <div className="mt-3 bg-slate-50 p-3 rounded">
            {selectedId ? (()=>{
              const l = layers.find(x=>x.id===selectedId)
              if(!l) return <div>Select a layer</div>
              if(l.type==='text'){
                return (
                  <div className="space-y-2">
                    <input value={l.text} onChange={(e)=>updateLayer(l.id,{text:e.target.value})} className="w-full p-2 border rounded" />
                    <div className="flex gap-2">
                      <input type="number" value={l.fontSize} onChange={(e)=>updateLayer(l.id,{fontSize:parseInt(e.target.value||16)})} className="w-32 p-1 border rounded" />
                      <input type="color" value={l.fill} onChange={(e)=>updateLayer(l.id,{fill:e.target.value})} />
                      <select value={l.align} onChange={(e)=>updateLayer(l.id,{align:e.target.value})} className="p-1 border rounded">
                        <option value="left">left</option>
                        <option value="center">center</option>
                        <option value="right">right</option>
                      </select>
                    </div>
                  </div>
                )
              }
              return (
                <div>
                  <div>Image layer</div>
                  <div className="flex gap-2 mt-2">
                    <label>W</label>
                    <input type="number" value={l.width} onChange={(e)=>updateLayer(l.id,{width:parseInt(e.target.value||100)})} className="w-24 p-1 border rounded" />
                    <label>H</label>
                    <input type="number" value={l.height} onChange={(e)=>updateLayer(l.id,{height:parseInt(e.target.value||100)})} className="w-24 p-1 border rounded" />
                    <label>Opacity</label>
                    <input type="range" min={0} max={1} step={0.05} value={l.opacity||1} onChange={(e)=>updateLayer(l.id,{opacity:parseFloat(e.target.value)})} />
                  </div>
                  <div className="mt-2">
                    <button onClick={()=>fileRef.current.click()} className="px-3 py-1 border rounded">Replace Image</button>
                  </div>
                </div>
              )
            })() : <div className="text-slate-500">Select a layer to edit</div>}
          </div>
        </div>
      </div>
    </div>
  )
}
