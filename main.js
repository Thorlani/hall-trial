import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
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

const planeMesh = new THREE.Mesh(
  new THREE.PlaneGeometry(12, 12),
  new THREE.MeshBasicMaterial({
    side: THREE.DoubleSide,
    visible: false,
  })
);
planeMesh.rotateX(-Math.PI / 2);
scene.add(planeMesh);
planeMesh.name = "ground";

const grid = new THREE.GridHelper(12, 12);
scene.add(grid);

const highlightMesh = new THREE.Mesh(
  new THREE.PlaneGeometry(1, 1),
  new THREE.MeshBasicMaterial({
    side: THREE.DoubleSide,
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

const sphereMesh = new THREE.Mesh(
  new THREE.SphereGeometry(0.4, 4, 2),
  new THREE.MeshBasicMaterial({
    wireframe: false,
    color: 0x00FF00,
  })
);

// Initialize an array to keep track of the placed objects
const placedObjects = [];

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
    intersects.forEach(function (intersect) {
      if (intersect.object.name === "ground") {
        const sphereClone = sphereMesh.clone();
        sphereClone.position.copy(highlightMesh.position);
        scene.add(sphereClone);
        placedObjects.push(sphereClone);
      }
    });
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
