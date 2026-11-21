import * as THREE from '/museum/assets/three.module.js';
import {GLTFLoader} from '/museum/assets/GLTFLoader.js';

export async function loadLandscape(scene, onChange, onProgress = () => {}) {
  const gltf = await new GLTFLoader().loadAsync('/museum/assets/landscape.glb', e => { if (e.lengthComputable && e.total) onProgress(Math.min(.95, e.loaded / e.total * .95)); });
  const root = gltf.scene;
  root.name = 'Landscape_LOVA';
  root.scale.setScalar(.01);
  const cloned = new Map();
  const removedNames = [];
  const hidden = /^(desktop_|portfolio_text_|about_text_block|services_text_block|text_global_|text_mobile_|Group|Layer_1|3_Group|Play_button|Logo_Rotation|FloorMirror|Tex_03001$)/;

  root.traverse(node => {
    if (node.isCamera || hidden.test(node.name)) {
      node.visible = false;
      removedNames.push(node.name);
      return;
    }
    if (!node.isMesh) return;
    const materials = Array.isArray(node.material) ? node.material : [node.material];
    node.material = materials.map(material => {
      if (!cloned.has(material)) {
        const copy = material.clone();
        // Preserve the original texture colours and baked illumination.
        copy.toneMapped = false;
        copy.fog = false;
        cloned.set(material, copy);
      }
      return cloned.get(material);
    });
    if (node.material.length === 1) node.material = node.material[0];
    if (/^light_/.test(node.name)) node.material = new THREE.MeshBasicMaterial({color:'#ffffff',toneMapped:false});
    node.castShadow = false;
    node.receiveShadow = false;
  });

  // These two source meshes combine the wall and extruded studio slogans.
  // Rebuild only their planar wall surface, sampling the clean architectural
  // region of the same original atlas; no text or slogan shadow is retained.
  for (const name of ['DesktopWall_001','DesktopWall_002']) {
    const wall = root.getObjectByName(name);
    if (!wall) continue;
    wall.geometry = new THREE.PlaneGeometry(2292.232,573.058);
    wall.material = wall.material.clone();
    wall.material.map = wall.material.map.clone();
    wall.material.map.repeat.set(.45,.20);
    wall.material.map.offset.set(0,.79);
    wall.material.map.needsUpdate = true;
  }

  // Remove the studio's rotating initial and its supporting stand from the
  // first alcove; the existing architectural shell and plants remain.
  const initialStand = root.getObjectByName('Tex_4k_02_011');
  if (initialStand) initialStand.visible = false;

  // Keep the original globe as an architectural feature of the closing room.
  const globe = root.getObjectByName('Planet_Rotation');


  // Replace only the showreel content; the surrounding architecture is untouched.
  const screen = root.getObjectByName('screen_showreel');
  if (screen) screen.material = new THREE.MeshBasicMaterial({color:'#171717', toneMapped:false});

  // The source frames are reused. Their placeholder colours become real
  // public-domain paintings, fitted without stretching or cropping.
  const frameNames=['work_prev_01_0','work_prev_02_1','work_prev_03_2','work_prev_04_3','work_prev_05_4','work_prev_06_5'];
  const paintings=[null,'vangogh','seurat','monet','vangogh','seurat'];
  const loader = new THREE.TextureLoader();
  frameNames.forEach((name,index) => {
    const frame=root.getObjectByName(name);
    if (!frame) return;
    frame.material=new THREE.MeshBasicMaterial({color:'#181818',toneMapped:false});
    if (!paintings[index]) return;
    loader.load(`/museum/assets/${paintings[index]}.webp`,source => {
      const canvas=document.createElement('canvas');canvas.width=1280;canvas.height=960;
      const context=canvas.getContext('2d');context.fillStyle='#181818';context.fillRect(0,0,1280,960);
      const image=source.image,scale=Math.min(1190/image.width,870/image.height);
      context.drawImage(image,(1280-image.width*scale)/2,(960-image.height*scale)/2,image.width*scale,image.height*scale);
      const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;texture.flipY=false;
      frame.material.map=texture;frame.material.color.set('#ffffff');frame.material.needsUpdate=true;
      source.dispose();onChange();
    },undefined,()=>onChange());
  });

  scene.add(root);
  root.updateMatrixWorld(true);
  return {root, globe, removedNames, sourceAnimations:gltf.animations.map(a=>a.name)};
}
