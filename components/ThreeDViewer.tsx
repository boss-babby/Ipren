import React, { useEffect, useRef, memo } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

interface ThreeDViewerProps {
    src: string;
}

const ThreeDViewer: React.FC<ThreeDViewerProps> = ({ src }) => {
    const mountRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const mountNode = mountRef.current;
        if (!mountNode) return;

        // Scene setup
        const scene = new THREE.Scene();

        // Camera setup
        const camera = new THREE.PerspectiveCamera(75, mountNode.clientWidth / mountNode.clientHeight, 0.1, 1000);
        // Camera position will be set dynamically after loading the model.

        // Renderer setup
        const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        renderer.setSize(mountNode.clientWidth, mountNode.clientHeight);
        renderer.setPixelRatio(window.devicePixelRatio);
        mountNode.appendChild(renderer.domElement);

        // Controls
        const controls = new OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;

        // Lighting
        const ambientLight = new THREE.AmbientLight(0xffffff, 1.5);
        scene.add(ambientLight);
        const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
        directionalLight.position.set(5, 10, 7.5);
        scene.add(directionalLight);

        // Model Loader
        const loader = new GLTFLoader();
        loader.load(src, (gltf) => {
            const model = gltf.scene;

            // --- START OF FIT-TO-VIEW LOGIC ---

            // 1. Get the bounding box of the model
            const box = new THREE.Box3().setFromObject(model);
            const size = box.getSize(new THREE.Vector3());
            const center = box.getCenter(new THREE.Vector3());

            // 2. Center the model at the origin
            model.position.sub(center);
            scene.add(model);
            
            // 3. Calculate the distance required to fit the model in the camera's view
            const vFovRad = camera.fov * (Math.PI / 180);
            
            // Calculate distance based on vertical FOV
            const distanceForHeight = (size.y / 2) / Math.tan(vFovRad / 2);
            
            // Calculate distance based on horizontal FOV
            const hFovRad = 2 * Math.atan(Math.tan(vFovRad / 2) * camera.aspect);
            const distanceForWidth = (size.x / 2) / Math.tan(hFovRad / 2);

            // Use the larger of the two distances to ensure the whole model is visible
            const distance = Math.max(distanceForHeight, distanceForWidth);

            // 4. Position the camera
            // Move it back along the Z-axis by the calculated distance + half the model's depth
            // Add a 10% padding so it's not edge-to-edge
            camera.position.z = (distance + size.z / 2) * 1.1;
            
            // Update near and far planes for better performance and to avoid clipping
            camera.near = 0.01 * camera.position.z;
            camera.far = 100 * camera.position.z;
            camera.updateProjectionMatrix();

            // 5. Point the camera to the center of the model (which is now the origin)
            // and update the orbit controls target
            controls.target.set(0, 0, 0);
            controls.update();

            // --- END OF FIT-TO-VIEW LOGIC ---

        }, undefined, (error) => {
            console.error('An error happened while loading 3D model:', error);
        });

        // Animation loop
        const animate = () => {
            requestAnimationFrame(animate);
            controls.update();
            renderer.render(scene, camera);
        };
        animate();

        // Handle resize
        const handleResize = () => {
            if (mountNode) {
                const width = mountNode.clientWidth;
                const height = mountNode.clientHeight;
                if (width > 0 && height > 0) {
                    camera.aspect = width / height;
                    camera.updateProjectionMatrix();
                    renderer.setSize(width, height);
                }
            }
        };
        
        const resizeObserver = new ResizeObserver(handleResize);
        resizeObserver.observe(mountNode);


        // Cleanup
        return () => {
            resizeObserver.disconnect();
            if (mountNode.contains(renderer.domElement)) {
                mountNode.removeChild(renderer.domElement);
            }
            renderer.dispose();
        };
    }, [src]);

    return <div ref={mountRef} className="w-full h-full cursor-grab active:cursor-grabbing" />;
};

export default memo(ThreeDViewer);