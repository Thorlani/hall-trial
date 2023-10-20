import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";

const renderer = new THREE.WebGL1Renderer({
  antialias: true,
});

renderer.physicallyCorrectLights = true;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ReinhardToneMapping;
renderer.toneMappingExposure = 5;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Colors
const COLORS = {
  background: "white",
  light: "#ffffff",
  sky: "#aaaaff",
  ground: "#88ff88",
};

const scene = new THREE.Scene();
scene.background = new THREE.Color(COLORS.background);
const camera = new THREE.PerspectiveCamera(
  45,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);

// Sets orbit control to move the camera around
const orbit = new OrbitControls(camera, renderer.domElement);

// Camera positioning
camera.position.set(10, 15, -22);
orbit.update();

// LIGHTS

const directionalLight = new THREE.DirectionalLight(COLORS.light, 2);
directionalLight.castShadow = true;
directionalLight.shadow.camera.far = 10;
directionalLight.shadow.mapSize.set(1024, 1024);
directionalLight.shadow.normalBias = 0.05;
directionalLight.position.set(2, 5, 3);

scene.add(directionalLight);

const hemisphereLight = new THREE.HemisphereLight(
  COLORS.sky,
  COLORS.ground,
  0.5
);
scene.add(hemisphereLight);

const textureloader = new THREE.TextureLoader();
const tilesBaseColor = textureloader.load(
  "floor-texture/Wood_Tiles_003_basecolor.jpg"
);
const tilesNormalMap = textureloader.load(
  "floor-texture/Wood_Tiles_003_normal.jpg"
);
const tilesHeightMap = textureloader.load(
  "floor-texture/Wood_Tiles_003_height.png"
);
const tilesRoughnessMap = textureloader.load(
  "floor-texture/Wood_Tiles_003_roughness.jpg"
);
const tilesAmbientOcclusionMap = textureloader.load(
  "floor-texture/Wood_Tiles_003_ambientOcclusion.jpg"
);

const planeMesh = new THREE.Mesh(
  new THREE.PlaneGeometry(12, 12, 512, 512),
  new THREE.MeshStandardMaterial({
    map: tilesBaseColor,
    normalMap: tilesNormalMap,
    displacementMap: tilesHeightMap,
    displacementScale: -0.01,
    roughnessMap: tilesRoughnessMap,
    roughness: 0.5,
    aoMap: tilesAmbientOcclusionMap,
    visible: true,
    side: THREE.DoubleSide,
  })
);
planeMesh.rotateX(-Math.PI / 2);
scene.add(planeMesh);
// planeMesh.position.set(0,-.6,0)
planeMesh.name = "ground";

const grid = new THREE.GridHelper(12, 12);
scene.add(grid);

const highlightMesh = new THREE.Mesh(
  new THREE.PlaneGeometry(1, 1),
  new THREE.MeshBasicMaterial({
    side: THREE.DoubleSide,
    color: 0x0effff,
  })
);
highlightMesh.rotateX(-Math.PI / 2);
highlightMesh.position.set(0.5, 0, 0.5);
scene.add(highlightMesh);

const mousePosition = new THREE.Vector2();
const raycaster = new THREE.Raycaster();
let intersects;

window.addEventListener("mousemove", function (e) {
  mousePosition.x = (e.clientX / window.innerWidth) * 2 - 1;
  mousePosition.y = -(e.clientY / window.innerHeight) * 2 + 1;
  raycaster.setFromCamera(mousePosition, camera);
  intersects = raycaster.intersectObjects(scene.children);
  intersects.forEach(function (intersect) {
    if (intersect.object.name === "ground") {
      const highlightPos = new THREE.Vector3()
        .copy(intersect.point)
        .floor()
        .addScalar(0.5);
      highlightMesh.position.set(highlightPos.x, 0, highlightPos.z);
    }
  });
});

const tableAndChairs = new URL("table-and-chairs/scene.gltf", import.meta.url);

const loadingManager = new THREE.LoadingManager();

const progressBar = document.getElementById("progress-bar");

loadingManager.onProgress = function (url, loaded, total) {
  progressBar.value = (loaded / total) * 100;
};

const progressBarContainer = document.querySelector(".progress-bar-container");

loadingManager.onLoad = function () {
  progressBarContainer.style.display = "none";
};

const assetLoader = new GLTFLoader(loadingManager);

let stag;
assetLoader.load(
  tableAndChairs.href,
  function (gltf) {
    const model = gltf.scene;
    model.scale.set(0.15, 0.15, 0.15);
    // scene.add(model);
    stag = model;
    model.position.set(0.5, 0, 0.5);
  },
  undefined,
  function (err) {
    console.log(err);
  }
);

// Initialize an array to keep track of the placed objects
const placedObjects = [];

//Pillars that would not be clickable
const restrictedPositions = [
  { x: 0.5, y: 0, z: 0.5 },
  { x: 4.5, y: 0, z: 4.5 },
  { x: 4.5, y: 0, z: -4.5 },
  { x: -4.5, y: 0, z: 4.5 },
  { x: -4.5, y: 0, z: -4.5 },
];

// Create a material for the red grid lines
const redGridMaterial = new THREE.LineBasicMaterial({ color: 0xff0000 });

// Loop through the restricted positions and create red grid lines
restrictedPositions.forEach((position) => {
  const geometry = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(position.x, 0, position.z),
    new THREE.Vector3(position.x + 0.1, 0, position.z - 0.5), // Adjust the length of the grid line as needed
  ]);
  const redGridLine = new THREE.Line(geometry, redGridMaterial);
  scene.add(redGridLine);
});

const minDistance = 2.0; // Adjust this value as needed

// Handle object placement on clicks
window.addEventListener("mousedown", function () {
  // Check if the clicked position is already occupied by an object
  const existingObject = placedObjects.find((object) => {
    return (
      object.position.z === highlightMesh.position.z &&
      object.position.x === highlightMesh.position.x
    );
  });

  if (!existingObject) {
    // Check proximity to existing objects
    const isProximate = placedObjects.some((object) => {
      const dx = object.position.x - highlightMesh.position.x;
      const dz = object.position.z - highlightMesh.position.z;
      const distance = Math.sqrt(dx * dx + dz * dz);
      return distance < minDistance;
    });

    // Check if the clicked position is in a restricted area
    const isRestricted = restrictedPositions.some((position) => {
      return (
        position.x === highlightMesh.position.x &&
        position.z === highlightMesh.position.z
      );
    });

    if (!isProximate && !isRestricted) {
      intersects.forEach(function (intersect) {
        if (intersect.object.name === "ground") {
          const stagClone = stag.clone();
          stagClone.position.copy(highlightMesh.position);
          scene.add(stagClone);
          placedObjects.push(stagClone);
        }
      });
    }
  }
});

// Handle object removal on double-clicks
window.addEventListener("dblclick", function () {
  intersects.forEach(function (intersect) {
    if (intersect.object.name === "ground") {
      const selectedPosition = new THREE.Vector3(
        highlightMesh.position.x,
        highlightMesh.position.y,
        highlightMesh.position.z
      );

      const objectToRemove = placedObjects.find((object) => {
        return object.position.equals(selectedPosition);
      });

      if (objectToRemove) {
        scene.remove(objectToRemove);
        placedObjects.splice(placedObjects.indexOf(objectToRemove), 1);
      }
    }
  });
});

function animate() {
  renderer.render(scene, camera);
}

renderer.setAnimationLoop(animate);

window.addEventListener("resize", function () {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
