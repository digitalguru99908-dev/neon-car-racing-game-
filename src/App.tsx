import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { 
  Trophy, 
  Target, 
  Zap, 
  Cpu, 
  Volume2, 
  VolumeX, 
  Compass, 
  User, 
  Shield, 
  ArrowLeft, 
  ArrowRight,
  Info,
  Award,
  Pause,
  Play
} from 'lucide-react';

/* ---------- AUDIO SYNTH ENGINE ---------- */
class SynthEngine {
  private ctx: AudioContext | null = null;
  private osc: OscillatorNode | null = null;
  private filter: BiquadFilterNode | null = null;
  private gainNode: GainNode | null = null;
  private isMuted: boolean = false;

  constructor() {
    // Lazy loaded on first user interaction
  }

  init() {
    if (this.ctx) return;
    try {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    } catch (e) {
      console.warn("Web Audio not supported", e);
    }
  }

  setMute(muted: boolean) {
    this.isMuted = muted;
    if (muted) {
      this.stopEngine();
    } else {
      this.startEngine();
    }
  }

  startEngine() {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    if (this.osc) return;

    try {
      this.osc = this.ctx.createOscillator();
      this.filter = this.ctx.createBiquadFilter();
      this.gainNode = this.ctx.createGain();

      this.osc.type = 'sawtooth';
      this.osc.frequency.setValueAtTime(45, this.ctx.currentTime); // Deep rumble

      this.filter.type = 'lowpass';
      this.filter.frequency.setValueAtTime(140, this.ctx.currentTime); // Cozy filtering

      this.gainNode.gain.setValueAtTime(0.06, this.ctx.currentTime);

      this.osc.connect(this.filter);
      this.filter.connect(this.gainNode);
      this.gainNode.connect(this.ctx.destination);

      this.osc.start();
    } catch (e) {
      console.error("Failed to start synth engine", e);
    }
  }

  updateEngine(speed: number) {
    if (this.isMuted || !this.ctx || !this.osc || !this.filter) return;
    // Map speed to oscillator frequency (rpm noise)
    const freq = 45 + speed * 1.6;
    this.osc.frequency.setTargetAtTime(freq, this.ctx.currentTime, 0.1);
    
    // Map speed to filter frequency (brighter engine pitch)
    const filterFreq = 140 + speed * 4.5;
    this.filter.frequency.setTargetAtTime(filterFreq, this.ctx.currentTime, 0.1);
  }

  stopEngine() {
    if (this.osc) {
      try {
        this.osc.stop();
        this.osc.disconnect();
      } catch (e) {}
      this.osc = null;
    }
    if (this.filter) {
      this.filter.disconnect();
      this.filter = null;
    }
    if (this.gainNode) {
      this.gainNode.disconnect();
      this.gainNode = null;
    }
  }

  playShift() {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;
    if (this.ctx.state === 'suspended') this.ctx.resume();

    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(180, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(500, this.ctx.currentTime + 0.12);

      gain.gain.setValueAtTime(0.04, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.12);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start();
      osc.stop(this.ctx.currentTime + 0.13);
    } catch (e) {}
  }

  playCrash() {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;
    if (this.ctx.state === 'suspended') this.ctx.resume();

    try {
      // White noise explosion burst
      const bufferSize = this.ctx.sampleRate * 0.5;
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }

      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(200, this.ctx.currentTime);
      filter.frequency.exponentialRampToValueAtTime(15, this.ctx.currentTime + 0.5);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.25, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.5);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);

      noise.start();
      noise.stop(this.ctx.currentTime + 0.55);

      // Low bass punch
      const subOsc = this.ctx.createOscillator();
      const subGain = this.ctx.createGain();
      subOsc.type = 'sawtooth';
      subOsc.frequency.setValueAtTime(100, this.ctx.currentTime);
      subOsc.frequency.linearRampToValueAtTime(10, this.ctx.currentTime + 0.35);

      subGain.gain.setValueAtTime(0.18, this.ctx.currentTime);
      subGain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.4);

      subOsc.connect(subGain);
      subGain.connect(this.ctx.destination);

      subOsc.start();
      subOsc.stop(this.ctx.currentTime + 0.45);
    } catch (e) {}
  }
}

const synth = new SynthEngine();

/* ---------- VEHICLE DEFINITIONS ---------- */
interface Vehicle {
  id: 'titan' | 'blade' | 'glide' | 'bmw';
  name: string;
  mark: string;
  color: number;
  underglow: number;
  velocity: number;
  agility: number;
  resilience: number;
  speedMultiplier: number;
  shiftSpeed: number;
  description: string;
}

const VEHICLES: readonly Vehicle[] = [
  {
    id: 'titan',
    name: 'VX-TITAN',
    mark: 'MARK III',
    color: 0x0a1e36, // Heavy dark slate blue
    underglow: 0x00f0ff, // Neon Cyan
    velocity: 94,
    agility: 65,
    resilience: 80,
    speedMultiplier: 1.0,
    shiftSpeed: 8,
    description: 'Fused carbon chassis with enhanced particle shielding. High stability and heavy road friction.'
  },
  {
    id: 'blade',
    name: 'NEON-BLADE',
    mark: 'MARK V',
    color: 0x3d0728, // Deep crimson magenta
    underglow: 0xff2ec4, // Hot Neon Pink
    velocity: 99,
    agility: 82,
    resilience: 45,
    speedMultiplier: 1.25,
    shiftSpeed: 10,
    description: 'Stripped core frame with dual supercharged grid-injectors. Fast, but delicate to collisions.'
  },
  {
    id: 'glide',
    name: 'CYBER-GLIDE',
    mark: 'MARK I',
    color: 0x2e2402, // Cyber amber gold
    underglow: 0xffb703, // Bright Neon Amber
    velocity: 85,
    agility: 95,
    resilience: 60,
    speedMultiplier: 0.85,
    shiftSpeed: 13,
    description: 'Pneumatic vector steering and hover thrusters. Unmatched agility for rapid lane switches.'
  },
  {
    id: 'bmw',
    name: 'BMW E34',
    mark: 'STANCE STYLE',
    color: 0x111115, // Stealth jet black
    underglow: 0x7b2ff7, // Neon Indigo Violet
    velocity: 96,
    agility: 88,
    resilience: 90,
    speedMultiplier: 1.15,
    shiftSpeed: 11,
    description: 'Procedurally synthesized retro E34 stance chassis. Ultra-low drop suspension with chrome dish wheels.'
  }
];

export default function App() {
  /* ---------- REACT STATE ---------- */
  const [gameState, setGameState] = useState<'title' | 'playing' | 'gameover'>('title');
  const [score, setScore] = useState<number>(0);
  const [highScore, setHighScore] = useState<number>(() => {
    try {
      return parseInt(localStorage.getItem('neon_rush_highscore') || '0', 10);
    } catch {
      return 0;
    }
  });
  const [speed, setSpeed] = useState<number>(0);
  const [selectedVehicleId, setSelectedVehicleId] = useState<'titan' | 'blade' | 'glide' | 'bmw'>('titan');
  const [paused, setPaused] = useState<boolean>(false);
  const [muted, setMuted] = useState<boolean>(false);
  const [username, setUsername] = useState<string>(() => {
    try {
      return localStorage.getItem('neon_rush_username') || 'SEEKER_X';
    } catch {
      return 'SEEKER_X';
    }
  });
  const [isEditingName, setIsEditingName] = useState<boolean>(false);
  const [nameInput, setNameInput] = useState<string>(username);
  const [dodgeCount, setDodgeCount] = useState<number>(0);
  const [ping, setPing] = useState<number>(12);

  // Leaderboard mock players + active player inserted dynamically
  const [leaderboard, setLeaderboard] = useState([
    { name: 'HYPER_V', score: 142092 },
    { name: 'NULL_POINTER', score: 128440 },
    { name: 'GHOST_SHELL', score: 115201 },
    { name: 'DATA_DRIFT', score: 98332 },
    { name: 'CYBER_PUNK', score: 87110 }
  ]);

  /* ---------- REFS ---------- */
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameLoopRef = useRef<any>(null);

  // Active vehicle state ref for the fast-paced Three.js animation loop
  const activeVehicleRef = useRef<Vehicle>(VEHICLES[0]);
  const pausedRef = useRef<boolean>(false);

  // Sync paused state to ref and adjust engine sound pitch
  useEffect(() => {
    pausedRef.current = paused;
    if (paused) {
      synth.updateEngine(0);
    } else if (gameState === 'playing') {
      synth.updateEngine(speed);
    }
  }, [paused, gameState, speed]);

  // Update high score in local storage
  const saveHighScore = (newScore: number) => {
    setHighScore(newScore);
    try {
      localStorage.setItem('neon_rush_highscore', newScore.toString());
    } catch (e) {}
  };

  // Ping update simulation
  useEffect(() => {
    const interval = setInterval(() => {
      setPing(prev => {
        const delta = Math.random() > 0.5 ? 1 : -1;
        const next = prev + delta;
        return next < 8 ? 8 : next > 16 ? 16 : next;
      });
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  // Sync mute state to Audio Synth Engine
  useEffect(() => {
    synth.setMute(muted);
  }, [muted]);

  // Sync active vehicle ref when user clicks in React UI
  const handleSelectVehicle = (id: 'titan' | 'blade' | 'glide' | 'bmw') => {
    setSelectedVehicleId(id);
    const vehicle = VEHICLES.find(v => v.id === id);
    if (vehicle) {
      activeVehicleRef.current = vehicle;
      // Trigger update to existing car elements in Three.js scene
      if (gameLoopRef.current && typeof gameLoopRef.current.updateCarMaterials === 'function') {
        gameLoopRef.current.updateCarMaterials(vehicle);
      }
    }
  };

  // Submit username change
  const handleSaveUsername = () => {
    let clean = nameInput.trim().toUpperCase().substring(0, 14);
    if (!clean) clean = 'SEEKER_X';
    setUsername(clean);
    setIsEditingName(false);
    try {
      localStorage.setItem('neon_rush_username', clean);
    } catch {}
  };

  /* ---------- GAME ACTION TRIGGER HANDLERS ---------- */
  const startGame = () => {
    synth.init();
    synth.startEngine();
    setGameState('playing');
    setPaused(false);
    setDodgeCount(0);
    if (gameLoopRef.current && typeof gameLoopRef.current.resetGame === 'function') {
      gameLoopRef.current.resetGame();
    }
  };

  const restartGame = () => {
    setPaused(false);
    startGame();
  };

  // Setup Three.js Grid Engine
  useEffect(() => {
    if (!canvasRef.current || !containerRef.current) return;

    /* ---------- CONFIG ---------- */
    const ROAD_WIDTH = 9;
    const LANE_WIDTH = ROAD_WIDTH / 3;
    const LANE_X = [-LANE_WIDTH, 0, LANE_WIDTH];
    const SEG_LEN = 30;
    const NUM_SEGMENTS = 7;
    const CAR_Z = 0.4;
    const SPAWN_FAR_Z = CAR_Z - (NUM_SEGMENTS - 1) * SEG_LEN - 10;
    const BASE_SPEED = 18;
    const MAX_SPEED = 50;
    const SPEED_RAMP = 0.45;
    const IDLE_SPEED = 7;

    const COLORS = {
      bg: 0x05050b, 
      road: 0x12121f, 
      ground: 0x07070f,
      cyan: 0x00f0ff, 
      magenta: 0xff2ec4, 
      amber: 0xffb703, 
      violet: 0x7b2ff7
    };

    /* ---------- INITIAL THREE ENVIRONMENT ---------- */
    const scene = new THREE.Scene();
    scene.fog = new THREE.Fog(COLORS.bg, 16, 95);

    const camera = new THREE.PerspectiveCamera(72, 1, 0.1, 500);
    camera.position.set(0, 1.85, CAR_Z + 4.8);

    const renderer = new THREE.WebGLRenderer({ 
      canvas: canvasRef.current, 
      antialias: true,
      alpha: false 
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(COLORS.bg, 1);

    // Dynamic resize handler using ResizeObserver (Constraint Checklist Item)
    const resizeObserver = new ResizeObserver((entries) => {
      if (!entries || entries.length === 0) return;
      const { width, height } = entries[0].contentRect;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height, false);
    });
    resizeObserver.observe(containerRef.current);

    /* ---------- LIGHTS ---------- */
    const ambientLight = new THREE.AmbientLight(0x404066, 1.2);
    scene.add(ambientLight);

    const hemisphereLight = new THREE.HemisphereLight(0x7b2ff7, 0x05050b, 0.8);
    scene.add(hemisphereLight);

    /* ---------- RETRO STARFIELD ---------- */
    const starsCount = 500;
    const starsGeometry = new THREE.BufferGeometry();
    const starPositions = new Float32Array(starsCount * 3);
    for (let i = 0; i < starsCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const radius = 110 + Math.random() * 210;
      starPositions[i * 3] = Math.cos(angle) * radius;
      starPositions[i * 3 + 1] = 8 + Math.random() * 95;
      starPositions[i * 3 + 2] = -Math.random() * 380 + 30;
    }
    starsGeometry.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
    const starMaterial = new THREE.PointsMaterial({ 
      color: 0xbfe9ff, 
      size: 0.85, 
      transparent: true, 
      opacity: 0.75 
    });
    starMaterial.fog = false;
    const starfield = new THREE.Points(starsGeometry, starMaterial);
    scene.add(starfield);

    /* ---------- HORIZON SUN ---------- */
    const createSunTexture = () => {
      const canvasEl = document.createElement('canvas'); 
      canvasEl.width = 256; 
      canvasEl.height = 256;
      const ctx = canvasEl.getContext('2d')!;
      const grad = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
      grad.addColorStop(0, 'rgba(255,120,210,0.95)');
      grad.addColorStop(0.3, 'rgba(255,70,170,0.55)');
      grad.addColorStop(0.6, 'rgba(123,47,247,0.22)');
      grad.addColorStop(1, 'rgba(123,47,247,0)');
      ctx.fillStyle = grad; 
      ctx.fillRect(0, 0, 256, 256);
      return new THREE.CanvasTexture(canvasEl);
    };

    const sunGeo = new THREE.CircleGeometry(46, 32);
    const sunMat = new THREE.MeshBasicMaterial({ 
      map: createSunTexture(), 
      transparent: true, 
      depthWrite: false, 
      blending: THREE.AdditiveBlending 
    });
    const horizonSun = new THREE.Mesh(sunGeo, sunMat);
    horizonSun.position.set(0, 19, -250);
    scene.add(horizonSun);

    /* ---------- ZONE SYSTEM CONFIGURATION ---------- */
    const ZONE_LENGTH = 900; // Switch zones every 900 meters
    
    const ZONE_LIGHTING = [
      {
        // Zone 0: Coastal daylight
        fogColor: new THREE.Color(0xf6d5b8),
        ambientColor: new THREE.Color(0xfff0dd),
        ambientIntensity: 1.1,
        hemisphereSky: new THREE.Color(0x9cc6e7),
        hemisphereGround: new THREE.Color(0x524136),
        hemisphereIntensity: 0.8,
        sunColor: new THREE.Color(0xff8c00),
        sunOpacity: 0.95,
        starOpacity: 0.0,
        roadColor: new THREE.Color(0x202028),
        groundColor: new THREE.Color(0xd2b48c)
      },
      {
        // Zone 1: Countryside overcast
        fogColor: new THREE.Color(0x606c7a),
        ambientColor: new THREE.Color(0x6d7987),
        ambientIntensity: 0.85,
        hemisphereSky: new THREE.Color(0x7c8a99),
        hemisphereGround: new THREE.Color(0x2b3036),
        hemisphereIntensity: 0.5,
        sunColor: new THREE.Color(0xaaaaaa),
        sunOpacity: 0.15,
        starOpacity: 0.0,
        roadColor: new THREE.Color(0x181822),
        groundColor: new THREE.Color(0x1c351c)
      },
      {
        // Zone 2: City street dusk
        fogColor: new THREE.Color(0x0e0518),
        ambientColor: new THREE.Color(0x2a0845),
        ambientIntensity: 1.2,
        hemisphereSky: new THREE.Color(0xff007f),
        hemisphereGround: new THREE.Color(0x05020c),
        hemisphereIntensity: 0.7,
        sunColor: new THREE.Color(0xff2ec4),
        sunOpacity: 0.85,
        starOpacity: 0.8,
        roadColor: new THREE.Color(0x0c0c14),
        groundColor: new THREE.Color(0x05050a)
      }
    ];

    const getZoneAtDistance = (dist: number) => {
      const totalZones = 3;
      const safeDist = Math.max(0, dist);
      const cycle = Math.floor(safeDist / ZONE_LENGTH);
      const currentZoneIndex = ((cycle % totalZones) + totalZones) % totalZones;
      const nextZoneIndex = (currentZoneIndex + 1) % totalZones;
      
      const progressInZone = safeDist % ZONE_LENGTH;
      const transitionStart = ZONE_LENGTH - 150; // Blend last 150 meters
      let transitionFactor = 0;
      if (progressInZone >= transitionStart) {
        transitionFactor = (progressInZone - transitionStart) / 150;
      }
      
      return {
        current: currentZoneIndex,
        next: nextZoneIndex,
        factor: transitionFactor
      };
    };

    const lerpColor = (c1: THREE.Color, c2: THREE.Color, t: number) => {
      return c1.clone().lerp(c2, t);
    };

    const lerpNum = (a: number, b: number, t: number) => {
      return a + (b - a) * t;
    };

    const populateSceneryForSegment = (segmentGroup: THREE.Group, segmentDistance: number) => {
      // Find the scenery child group
      let sceneryGroup = segmentGroup.getObjectByName("scenery") as THREE.Group;
      if (!sceneryGroup) {
        sceneryGroup = new THREE.Group();
        sceneryGroup.name = "scenery";
        segmentGroup.add(sceneryGroup);
      } else {
        // Clear old children safely to avoid memory leaks
        while (sceneryGroup.children.length > 0) {
          const obj = sceneryGroup.children[0];
          sceneryGroup.remove(obj);
          // Recursively dispose geometry and material if they exist
          obj.traverse((child: any) => {
            if (child.geometry) child.geometry.dispose();
            if (child.material) {
              if (Array.isArray(child.material)) {
                child.material.forEach((m) => m.dispose());
              } else {
                child.material.dispose();
              }
            }
          });
        }
      }

      // Determine active zone for this segment
      const zoneInfo = getZoneAtDistance(segmentDistance);
      const zoneIndex = zoneInfo.current;

      // Update segment ground and road colors based on the zone
      const targetLit = ZONE_LIGHTING[zoneIndex];
      const { roadMesh, groundMesh } = segmentGroup.userData;
      if (roadMesh) {
        (roadMesh.material as THREE.MeshStandardMaterial).color.copy(targetLit.roadColor);
      }
      if (groundMesh) {
        (groundMesh.material as THREE.MeshStandardMaterial).color.copy(targetLit.groundColor);
      }

      // Build procedural scenery based on zoneIndex
      if (zoneIndex === 0) {
        // --- 1. COASTAL HIGHWAY ---

        // Ocean plane on left side
        const oceanGeo = new THREE.PlaneGeometry(80, SEG_LEN);
        const oceanMat = new THREE.MeshStandardMaterial({
          color: 0x0077be,
          roughness: 0.15,
          metalness: 0.8,
          transparent: true,
          opacity: 0.85
        });
        const ocean = new THREE.Mesh(oceanGeo, oceanMat);
        ocean.rotation.x = -Math.PI / 2;
        ocean.position.set(-52, -0.01, 0); // Far left
        sceneryGroup.add(ocean);

        // Small island rocks in the ocean
        const numIslands = 1 + Math.floor(Math.random() * 2);
        for (let i = 0; i < numIslands; i++) {
          const rGeo = new THREE.DodecahedronGeometry(2 + Math.random() * 3, 1);
          const rMat = new THREE.MeshStandardMaterial({ color: 0xd2b48c, roughness: 0.9 });
          const island = new THREE.Mesh(rGeo, rMat);
          island.position.set(-18 - Math.random() * 10, -0.5, -SEG_LEN / 2 + Math.random() * SEG_LEN);
          sceneryGroup.add(island);
        }

        // Cliffs on right side
        const numCliffs = 1 + Math.floor(Math.random() * 2);
        for (let i = 0; i < numCliffs; i++) {
          const cGeo = new THREE.BoxGeometry(4 + Math.random() * 6, 8 + Math.random() * 12, 6 + Math.random() * 10);
          const cMat = new THREE.MeshStandardMaterial({ color: 0x8b7355, roughness: 0.95 });
          const cliff = new THREE.Mesh(cGeo, cMat);
          cliff.position.set(16 + Math.random() * 6, 3 + Math.random() * 2, -SEG_LEN / 2 + Math.random() * SEG_LEN);
          cliff.rotation.set(Math.random() * 0.2, Math.random() * 3.14, Math.random() * 0.2);
          sceneryGroup.add(cliff);
        }

        // Palm trees on right side
        const numTrees = 1 + Math.floor(Math.random() * 2);
        for (let i = 0; i < numTrees; i++) {
          const treeGroup = new THREE.Group();
          const height = 5 + Math.random() * 3;
          const trunkGeo = new THREE.CylinderGeometry(0.12, 0.22, height, 6);
          const trunkMat = new THREE.MeshStandardMaterial({ color: 0x5c4033, roughness: 0.9 });
          const trunk = new THREE.Mesh(trunkGeo, trunkMat);
          trunk.position.y = height / 2;
          trunk.rotation.z = -0.1 - Math.random() * 0.15;
          treeGroup.add(trunk);

          const leafMat = new THREE.MeshStandardMaterial({ color: 0x2e8b57, roughness: 0.7 });
          const numLeaves = 5;
          for (let l = 0; l < numLeaves; l++) {
            const leafGeo = new THREE.BoxGeometry(1.8, 0.06, 0.35);
            const leaf = new THREE.Mesh(leafGeo, leafMat);
            leaf.position.set(Math.sin(-trunk.rotation.z) * height, height - 0.2, 0);
            leaf.rotation.y = (l * Math.PI * 2) / numLeaves;
            leaf.rotation.z = -0.2 - Math.random() * 0.15;
            treeGroup.add(leaf);
          }

          treeGroup.position.set(11 + Math.random() * 3, 0, -SEG_LEN / 2 + Math.random() * SEG_LEN);
          sceneryGroup.add(treeGroup);
        }
      } else if (zoneIndex === 1) {
        // --- 2. COUNTRYSIDE ---

        // Parallel rail track on left side
        const railMat = new THREE.MeshStandardMaterial({ color: 0x888888, metalness: 0.9, roughness: 0.2 });
        const leftRailGeo = new THREE.BoxGeometry(0.08, 0.06, SEG_LEN);
        const r1 = new THREE.Mesh(leftRailGeo, railMat);
        r1.position.set(-15.8, 0.05, 0);
        const r2 = new THREE.Mesh(leftRailGeo, railMat);
        r2.position.set(-14.2, 0.05, 0);
        sceneryGroup.add(r1);
        sceneryGroup.add(r2);

        const sleeperMat = new THREE.MeshStandardMaterial({ color: 0x5c4033, roughness: 0.95 });
        const numSleepers = 15;
        for (let s = 0; s < numSleepers; s++) {
          const sleeperGeo = new THREE.BoxGeometry(2.0, 0.04, 0.25);
          const sleeper = new THREE.Mesh(sleeperGeo, sleeperMat);
          sleeper.position.set(-15, 0.02, -SEG_LEN / 2 + (SEG_LEN / numSleepers) * s);
          sceneryGroup.add(sleeper);
        }

        // Grassy fields
        const fieldMat = new THREE.MeshStandardMaterial({ color: 0x3b5323, roughness: 0.99 });
        const leftField = new THREE.Mesh(new THREE.PlaneGeometry(30, SEG_LEN), fieldMat);
        leftField.rotation.x = -Math.PI / 2;
        leftField.position.set(-32, -0.01, 0);
        sceneryGroup.add(leftField);

        const rightField = new THREE.Mesh(new THREE.PlaneGeometry(50, SEG_LEN), fieldMat);
        rightField.rotation.x = -Math.PI / 2;
        rightField.position.set(35, -0.01, 0);
        sceneryGroup.add(rightField);

        // Wooden fences on both sides of the road
        const fenceMat = new THREE.MeshStandardMaterial({ color: 0x8b5a2b, roughness: 0.98 });
        [-5.4, 5.4].forEach(fx => {
          const numPosts = 3;
          for (let p = 0; p < numPosts; p++) {
            const postZ = -SEG_LEN / 2 + (SEG_LEN / (numPosts - 1)) * p;
            const postGeo = new THREE.BoxGeometry(0.12, 1.1, 0.12);
            const post = new THREE.Mesh(postGeo, fenceMat);
            post.position.set(fx, 0.5, postZ);
            sceneryGroup.add(post);

            if (p < numPosts - 1) {
              const railLength = SEG_LEN / (numPosts - 1);
              const rail1Geo = new THREE.BoxGeometry(0.06, 0.1, railLength);
              const fenceR1 = new THREE.Mesh(rail1Geo, fenceMat);
              fenceR1.position.set(fx, 0.8, postZ + railLength / 2);
              const fenceR2 = new THREE.Mesh(rail1Geo, fenceMat);
              fenceR2.position.set(fx, 0.4, postZ + railLength / 2);
              sceneryGroup.add(fenceR1);
              sceneryGroup.add(fenceR2);
            }
          }
        });

        // Occasional trees (pines) on both sides of the road in the fields
        const numPines = 1 + Math.floor(Math.random() * 2);
        for (let i = 0; i < numPines; i++) {
          const treeGroup = new THREE.Group();
          const trunkGeo = new THREE.CylinderGeometry(0.1, 0.18, 1.5, 6);
          const trunkMat = new THREE.MeshStandardMaterial({ color: 0x5c4033, roughness: 0.95 });
          const trunk = new THREE.Mesh(trunkGeo, trunkMat);
          trunk.position.y = 0.75;
          treeGroup.add(trunk);

          const foliageMat = new THREE.MeshStandardMaterial({ color: 0x1b4d3e, roughness: 0.9 });
          const levels = 3;
          for (let l = 0; l < levels; l++) {
            const levelGeo = new THREE.ConeGeometry(1.2 - l * 0.3, 1.8, 8);
            const level = new THREE.Mesh(levelGeo, foliageMat);
            level.position.y = 1.6 + l * 1.0;
            treeGroup.add(level);
          }
          // Random side
          const isLeft = Math.random() > 0.5;
          const treeX = isLeft ? -18 - Math.random() * 6 : 8 + Math.random() * 10;
          treeGroup.position.set(treeX, 0, -SEG_LEN / 2 + Math.random() * SEG_LEN);
          sceneryGroup.add(treeGroup);
        }
      } else if (zoneIndex === 2) {
        // --- 3. CITY STREET ---

        // Buildings on both sides
        const numBuildings = 2 + Math.floor(Math.random() * 2);
        const buildingMat = new THREE.MeshStandardMaterial({ color: 0x1a1a24, roughness: 0.6, metalness: 0.5 });
        const windowMat = new THREE.MeshBasicMaterial({ color: 0xffdf6d });

        // Left buildings
        for (let i = 0; i < numBuildings; i++) {
          const bHeight = 15 + Math.random() * 20;
          const bWidth = 6 + Math.random() * 4;
          const bDepth = 6 + Math.random() * 6;
          const bGeo = new THREE.BoxGeometry(bWidth, bHeight, bDepth);
          const building = new THREE.Mesh(bGeo, buildingMat);
          
          const bX = -12 - Math.random() * 5;
          const bZ = -SEG_LEN / 2 + (SEG_LEN / numBuildings) * i;
          building.position.set(bX, bHeight / 2, bZ);
          sceneryGroup.add(building);

          const numWindowRows = Math.floor(bHeight / 4);
          const numWindowCols = Math.floor(bDepth / 2);
          for (let r = 0; r < numWindowRows; r++) {
            for (let c = 0; c < numWindowCols; c++) {
              if (Math.random() > 0.4) {
                const wPlaneGeo = new THREE.PlaneGeometry(0.35, 0.6);
                const win = new THREE.Mesh(wPlaneGeo, windowMat);
                win.position.set(bX + bWidth / 2 + 0.02, 2 + r * 3.5, bZ - bDepth/2 + 1 + c * 2);
                win.rotation.y = Math.PI / 2;
                sceneryGroup.add(win);
              }
            }
          }
        }

        // Right buildings
        for (let i = 0; i < numBuildings; i++) {
          const bHeight = 15 + Math.random() * 20;
          const bWidth = 6 + Math.random() * 4;
          const bDepth = 6 + Math.random() * 6;
          const bGeo = new THREE.BoxGeometry(bWidth, bHeight, bDepth);
          const building = new THREE.Mesh(bGeo, buildingMat);
          
          const bX = 12 + Math.random() * 5;
          const bZ = -SEG_LEN / 2 + (SEG_LEN / numBuildings) * i + SEG_LEN / (2 * numBuildings);
          building.position.set(bX, bHeight / 2, bZ);
          sceneryGroup.add(building);

          const numWindowRows = Math.floor(bHeight / 4);
          const numWindowCols = Math.floor(bDepth / 2);
          for (let r = 0; r < numWindowRows; r++) {
            for (let c = 0; c < numWindowCols; c++) {
              if (Math.random() > 0.4) {
                const wPlaneGeo = new THREE.PlaneGeometry(0.35, 0.6);
                const win = new THREE.Mesh(wPlaneGeo, windowMat);
                win.position.set(bX - bWidth / 2 - 0.02, 2 + r * 3.5, bZ - bDepth/2 + 1 + c * 2);
                win.rotation.y = -Math.PI / 2;
                sceneryGroup.add(win);
              }
            }
          }
        }

        // Crosswalk
        if (Math.random() > 0.5) {
          const numStripes = 6;
          const stripeWidth = 0.4;
          const stripeLength = 4.5;
          const stripeMat = new THREE.MeshBasicMaterial({ color: 0xdddddd });
          const crosswalkZ = -SEG_LEN / 2 + Math.random() * 6 + 12;

          for (let s = 0; s < numStripes; s++) {
            const stripeGeo = new THREE.BoxGeometry(stripeLength, 0.015, stripeWidth);
            const stripe = new THREE.Mesh(stripeGeo, stripeMat);
            stripe.position.set(0, 0.015, crosswalkZ);
            stripe.position.x = -ROAD_WIDTH / 2 + (ROAD_WIDTH / (numStripes - 1)) * s;
            sceneryGroup.add(stripe);
          }
        }

        // Traffic cones
        const coneCount = 1 + Math.floor(Math.random() * 2);
        const coneColorMat = new THREE.MeshStandardMaterial({ color: 0xff4500, roughness: 0.5 });
        const coneWhiteMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
        for (let c = 0; c < coneCount; c++) {
          const coneGroup = new THREE.Group();
          const baseGeo = new THREE.BoxGeometry(0.25, 0.03, 0.25);
          const base = new THREE.Mesh(baseGeo, coneColorMat);
          coneGroup.add(base);

          const tipGeo = new THREE.CylinderGeometry(0.01, 0.08, 0.42, 8);
          const tip = new THREE.Mesh(tipGeo, coneColorMat);
          tip.position.y = 0.21;
          coneGroup.add(tip);

          const stripeGeo = new THREE.CylinderGeometry(0.035, 0.055, 0.12, 8);
          const stripe = new THREE.Mesh(stripeGeo, coneWhiteMat);
          stripe.position.y = 0.22;
          coneGroup.add(stripe);

          const laneOption = Math.floor(Math.random() * 4);
          let coneX = 0;
          if (laneOption === 0) coneX = -ROAD_WIDTH / 2 + 0.3;
          else if (laneOption === 1) coneX = -LANE_WIDTH / 2;
          else if (laneOption === 2) coneX = LANE_WIDTH / 2;
          else coneX = ROAD_WIDTH / 2 - 0.3;

          coneGroup.position.set(coneX, 0.02, -SEG_LEN / 2 + Math.random() * SEG_LEN);
          sceneryGroup.add(coneGroup);
        }

        // Streetlights
        [-5.2, 5.2].forEach((sx) => {
          const lightGroup = new THREE.Group();
          const poleMat = new THREE.MeshStandardMaterial({ color: 0x33333b, roughness: 0.6 });
          const poleGeo = new THREE.CylinderGeometry(0.06, 0.08, 4.2, 8);
          const pole = new THREE.Mesh(poleGeo, poleMat);
          pole.position.y = 2.1;
          lightGroup.add(pole);

          const armGeo = new THREE.BoxGeometry(0.9, 0.06, 0.06);
          const arm = new THREE.Mesh(armGeo, poleMat);
          const armDir = sx > 0 ? -1 : 1;
          arm.position.set(armDir * 0.4, 4.2, 0);
          lightGroup.add(arm);

          const bulbGeo = new THREE.SphereGeometry(0.12, 8, 8);
          const bulbMat = new THREE.MeshBasicMaterial({ color: 0xffdf6d });
          const bulb = new THREE.Mesh(bulbGeo, bulbMat);
          bulb.position.set(armDir * 0.8, 4.12, 0);
          lightGroup.add(bulb);

          const lightConeGeo = new THREE.ConeGeometry(1.8, 4.0, 16, 1, true);
          const lightConeMat = new THREE.MeshBasicMaterial({
            color: 0xffdf6d,
            transparent: true,
            opacity: 0.18,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
            side: THREE.DoubleSide
          });
          const lightCone = new THREE.Mesh(lightConeGeo, lightConeMat);
          lightCone.position.set(armDir * 0.8, 2.0, 0);
          lightGroup.add(lightCone);

          lightGroup.position.set(sx, 0, -SEG_LEN / 2 + Math.random() * 5 + 12);
          sceneryGroup.add(lightGroup);
        });
      }
    };

    /* ---------- ROAD SEGMENT GENERATOR ---------- */
    const buildSegment = () => {
      const segmentGroup = new THREE.Group();

      // Asphalt Road
      const roadGeo = new THREE.PlaneGeometry(ROAD_WIDTH, SEG_LEN);
      const roadMat = new THREE.MeshStandardMaterial({ 
        color: COLORS.road, 
        roughness: 0.96, 
        metalness: 0.04 
      });
      const roadMesh = new THREE.Mesh(roadGeo, roadMat);
      roadMesh.rotation.x = -Math.PI / 2;
      segmentGroup.add(roadMesh);

      // Surrounding Ground Bed
      const groundGeo = new THREE.PlaneGeometry(75, SEG_LEN);
      const groundMat = new THREE.MeshStandardMaterial({ 
        color: COLORS.ground, 
        roughness: 1.0 
      });
      const groundMesh = new THREE.Mesh(groundGeo, groundMat);
      groundMesh.rotation.x = -Math.PI / 2;
      groundMesh.position.y = -0.03;
      segmentGroup.add(groundMesh);

      // Save references in userData
      segmentGroup.userData = {
        roadMesh: roadMesh,
        groundMesh: groundMesh
      };

      // Bright edge neon bars (Outer walls)
      [-ROAD_WIDTH / 2, ROAD_WIDTH / 2].forEach(x => {
        const stripGeo = new THREE.BoxGeometry(0.12, 0.08, SEG_LEN);
        const stripMat = new THREE.MeshBasicMaterial({ color: COLORS.magenta });
        const strip = new THREE.Mesh(stripGeo, stripMat);
        strip.position.set(x, 0.04, 0);
        segmentGroup.add(strip);
      });

      // Lanes division dashes (Cyan)
      [-LANE_WIDTH / 2, LANE_WIDTH / 2].forEach(x => {
        const count = 5;
        const dashLen = 2.4;
        const gap = SEG_LEN / count;
        for (let i = 0; i < count; i++) {
          const dashGeo = new THREE.BoxGeometry(0.08, 0.04, dashLen);
          const dashMat = new THREE.MeshBasicMaterial({ color: COLORS.cyan });
          const dash = new THREE.Mesh(dashGeo, dashMat);
          dash.position.set(x, 0.02, -SEG_LEN / 2 + gap * i + gap / 2);
          segmentGroup.add(dash);
        }
      });

      // Elegant grid speed lines crossbars
      for (let i = 0; i < 3; i++) {
        const barGeo = new THREE.BoxGeometry(ROAD_WIDTH, 0.012, 0.15);
        const barMat = new THREE.MeshBasicMaterial({ 
          color: COLORS.cyan, 
          transparent: true, 
          opacity: 0.20 
        });
        const crossbar = new THREE.Mesh(barGeo, barMat);
        crossbar.position.set(0, 0.01, -SEG_LEN / 2 + (SEG_LEN / 3) * i + 3);
        segmentGroup.add(crossbar);
      }

      return segmentGroup;
    };

    // Instantiate circular road buffer segments
    const segmentStartZ = CAR_Z + 12;
    const roadSegments: THREE.Group[] = [];
    for (let i = 0; i < NUM_SEGMENTS; i++) {
      const seg = buildSegment();
      seg.position.z = segmentStartZ - i * SEG_LEN;
      
      const segmentDistance = CAR_Z - seg.position.z;
      populateSceneryForSegment(seg, segmentDistance);

      scene.add(seg);
      roadSegments.push(seg);
    }

    /* ---------- DYNAMIC TRAIN SETUP ---------- */
    let trainActive = false;
    let trainZ = 0;
    let trainSpeed = 0;
    let trainCooldown = 2.0;

    const buildTrain = () => {
      const tGroup = new THREE.Group();
      const carLength = 12;
      const carGap = 0.8;
      const colors = [0xff0055, 0x00f0ff, 0xffb703, 0x7b2ff7];

      // Locomotive at the front (facing player)
      const locoGeo = new THREE.BoxGeometry(1.6, 1.4, carLength);
      const locoMat = new THREE.MeshStandardMaterial({ color: 0x333333, metalness: 0.8, roughness: 0.2 });
      const loco = new THREE.Mesh(locoGeo, locoMat);
      loco.position.set(0, 0.75, 0);
      tGroup.add(loco);

      // Windshield
      const cabinGeo = new THREE.BoxGeometry(1.5, 0.5, 3);
      const cabinMat = new THREE.MeshStandardMaterial({ color: 0x0c0c0e, roughness: 0.1 });
      const cabin = new THREE.Mesh(cabinGeo, cabinMat);
      cabin.position.set(0, 1.4, -2);
      tGroup.add(cabin);

      // Headlight bulb
      const headlightGeo = new THREE.SphereGeometry(0.2, 8, 8);
      const headlightMat = new THREE.MeshBasicMaterial({ color: 0xfffca3 });
      const headlight = new THREE.Mesh(headlightGeo, headlightMat);
      headlight.position.set(0, 0.75, carLength / 2 + 0.01);
      tGroup.add(headlight);

      // Headlight light cone
      const coneGeo = new THREE.ConeGeometry(2.5, 12, 16);
      const coneMat = new THREE.MeshBasicMaterial({
        color: 0xfffca3,
        transparent: true,
        opacity: 0.25,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      });
      const cone = new THREE.Mesh(coneGeo, coneMat);
      cone.rotation.x = Math.PI / 2;
      cone.position.set(0, 0.75, carLength / 2 + 6);
      tGroup.add(cone);

      // 3 Cars behind the locomotive
      for (let c = 0; c < 3; c++) {
        const color = colors[c % colors.length];
        const carMat = new THREE.MeshStandardMaterial({ color: color, metalness: 0.5, roughness: 0.3 });
        const carGeo = new THREE.BoxGeometry(1.5, 1.2, carLength);
        const car = new THREE.Mesh(carGeo, carMat);
        
        const offsetZ = -(c + 1) * (carLength + carGap);
        car.position.set(0, 0.65, offsetZ);
        tGroup.add(car);

        // Windows for cars
        const winGeo = new THREE.BoxGeometry(1.54, 0.2, 0.8);
        const winMat = new THREE.MeshBasicMaterial({ color: 0xfffeed });
        for (let w = 0; w < 4; w++) {
          const winL = new THREE.Mesh(winGeo, winMat);
          winL.position.set(0, 0.75, offsetZ - carLength/2 + 1.2 * w + 0.6);
          tGroup.add(winL);
        }
      }

      tGroup.position.set(-15, 0.1, -1000); // starts far away
      tGroup.visible = false;
      scene.add(tGroup);
      return tGroup;
    };

    const trainGroup = buildTrain();

    /* ---------- CAR MESH BUILDER ---------- */
    let carGroup = new THREE.Group();
    let carBodyMesh: THREE.Mesh;
    let carCabinMesh: THREE.Mesh;
    let underglowMesh: THREE.Mesh;
    let underglowPointLight: THREE.PointLight;
    let wheelMeshes: THREE.Mesh[] = [];
    let lateralTrimMeshes: THREE.Mesh[] = [];

    const buildActiveCar = () => {
      // Clear previous elements if existing
      while(carGroup.children.length > 0) {
        carGroup.remove(carGroup.children[0]);
      }
      wheelMeshes = [];
      lateralTrimMeshes = [];

      const activeV = activeVehicleRef.current;

      if (activeV.id === 'bmw') {
        // Procedural BMW E34 Stance Style
        const color = activeV.color; // 0x111115
        const bodyMat = new THREE.MeshStandardMaterial({ 
          color: color, 
          metalness: 0.8, 
          roughness: 0.15 
        });

        // 1. Lower chassis / bumper
        const chassisGeo = new THREE.BoxGeometry(1.6, 0.25, 3.25);
        const chassis = new THREE.Mesh(chassisGeo, bodyMat);
        chassis.position.y = 0.2;
        carGroup.add(chassis);

        // 2. Main boxy cabin body
        const cabinBodyGeo = new THREE.BoxGeometry(1.54, 0.45, 3.1);
        const cabinBody = new THREE.Mesh(cabinBodyGeo, bodyMat);
        cabinBody.position.y = 0.55;
        carGroup.add(cabinBody);

        // 3. Greenhouse (windows/roof) - Classic boxy E34 greenhouse
        const roofGeo = new THREE.BoxGeometry(1.3, 0.42, 1.6);
        const roofMat = new THREE.MeshStandardMaterial({
          color: 0x0c0c0e,
          roughness: 0.1,
          metalness: 0.9,
          transparent: true,
          opacity: 0.65
        });
        const roof = new THREE.Mesh(roofGeo, roofMat);
        roof.position.set(0, 0.95, -0.2);
        carGroup.add(roof);

        // Dark window pillars
        const pillarsGeo = new THREE.BoxGeometry(1.32, 0.42, 0.08);
        const pillarMat = new THREE.MeshStandardMaterial({ color: 0x111115 });
        const frontPillar = new THREE.Mesh(pillarsGeo, pillarMat);
        frontPillar.position.set(0, 0.95, 0.6);
        const rearPillar = new THREE.Mesh(pillarsGeo, pillarMat);
        rearPillar.position.set(0, 0.95, -1.0);
        carGroup.add(frontPillar);
        carGroup.add(rearPillar);

        // 4. Quad round headlights (Classic E34 face!)
        const lightGeo = new THREE.SphereGeometry(0.06, 8, 8);
        const lightMat = new THREE.MeshBasicMaterial({ color: 0xfff0aa });
        const lightsOffsets = [
          [-0.55, 0.48, 1.63],
          [-0.35, 0.48, 1.63],
          [0.35, 0.48, 1.63],
          [0.55, 0.48, 1.63]
        ];
        lightsOffsets.forEach(([lx, ly, lz]) => {
          const l = new THREE.Mesh(lightGeo, lightMat);
          l.position.set(lx, ly, lz);
          carGroup.add(l);
        });

        // Kidneys grille
        const kidneyGeo = new THREE.BoxGeometry(0.2, 0.12, 0.04);
        const kidneyMat = new THREE.MeshStandardMaterial({ color: 0x33333b, roughness: 0.5 });
        const kidneyLeft = new THREE.Mesh(kidneyGeo, kidneyMat);
        kidneyLeft.position.set(-0.11, 0.48, 1.63);
        const kidneyRight = new THREE.Mesh(kidneyGeo, kidneyMat);
        kidneyRight.position.set(0.11, 0.48, 1.63);
        carGroup.add(kidneyLeft);
        carGroup.add(kidneyRight);

        // 5. Red tail lights
        const tailLightGeo = new THREE.BoxGeometry(0.35, 0.10, 0.04);
        const tailLightMat = new THREE.MeshBasicMaterial({ color: 0xff0033 });
        const tailLeft = new THREE.Mesh(tailLightGeo, tailLightMat);
        tailLeft.position.set(-0.52, 0.58, -1.56);
        const tailRight = new THREE.Mesh(tailLightGeo, tailLightMat);
        tailRight.position.set(0.52, 0.58, -1.56);
        carGroup.add(tailLeft);
        carGroup.add(tailRight);

        // 6. Dual chrome exhaust tips on rear left
        const exhaustGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.35, 8);
        const exhaustMat = new THREE.MeshStandardMaterial({ color: 0xdddddd, metalness: 1.0, roughness: 0.1 });
        const exh1 = new THREE.Mesh(exhaustGeo, exhaustMat);
        exh1.rotation.x = Math.PI / 2;
        exh1.position.set(-0.45, 0.18, -1.65);
        const exh2 = new THREE.Mesh(exhaustGeo, exhaustMat);
        exh2.rotation.x = Math.PI / 2;
        exh2.position.set(-0.35, 0.18, -1.65);
        carGroup.add(exh1);
        carGroup.add(exh2);

        // 7. Stretched tires / Deep dish chrome wheels (Stance style!)
        const wheelOffsets = [
          [-0.86, 0.98], [0.86, 0.98], 
          [-0.86, -1.15], [0.86, -1.15]
        ];
        wheelOffsets.forEach(([wx, wz]) => {
          // Wheel outer tyre (cylinder)
          const tyreGeo = new THREE.CylinderGeometry(0.31, 0.31, 0.33, 16);
          const tyreMat = new THREE.MeshStandardMaterial({ color: 0x111113, roughness: 0.9 });
          const tyre = new THREE.Mesh(tyreGeo, tyreMat);
          tyre.rotation.z = Math.PI / 2;
          tyre.position.set(wx, 0.16, wz);
          carGroup.add(tyre);
          wheelMeshes.push(tyre);

          // Deep chrome lip/dish inside the wheel!
          const dishGeo = new THREE.CylinderGeometry(0.22, 0.22, 0.35, 12);
          const dishMat = new THREE.MeshStandardMaterial({ color: 0xffffff, metalness: 1.0, roughness: 0.05 });
          const dish = new THREE.Mesh(dishGeo, dishMat);
          dish.rotation.z = Math.PI / 2;
          dish.position.set(wx * 1.01, 0.16, wz);
          carGroup.add(dish);
        });

        // 8. Neon active underglow bar plane
        const glowPlaneGeo = new THREE.BoxGeometry(1.68, 0.04, 3.15);
        const glowPlaneMat = new THREE.MeshBasicMaterial({ color: activeV.underglow });
        underglowMesh = new THREE.Mesh(glowPlaneGeo, glowPlaneMat);
        underglowMesh.position.y = -0.01;
        carGroup.add(underglowMesh);

        // Active dynamic underglow point source
        underglowPointLight = new THREE.PointLight(activeV.underglow, 1.8, 6);
        underglowPointLight.position.set(0, 0.05, 0);
        carGroup.add(underglowPointLight);
      } else {
        // Lower main structural frame
        const bodyGeo = new THREE.BoxGeometry(1.58, 0.44, 3.1);
        const bodyMat = new THREE.MeshStandardMaterial({ 
          color: activeV.color, 
          metalness: 0.72, 
          roughness: 0.28, 
          emissive: activeV.color, 
          emissiveIntensity: 0.35 
        });
        carBodyMesh = new THREE.Mesh(bodyGeo, bodyMat);
        carBodyMesh.position.y = 0.26;
        carGroup.add(carBodyMesh);

        // Translucent glossy neon cabin
        const cabinGeo = new THREE.BoxGeometry(1.05, 0.40, 1.45);
        const cabinMat = new THREE.MeshStandardMaterial({ 
          color: activeV.underglow, 
          transparent: true, 
          opacity: 0.55, 
          metalness: 0.85, 
          roughness: 0.05, 
          emissive: activeV.underglow, 
          emissiveIntensity: 0.4 
        });
        carCabinMesh = new THREE.Mesh(cabinGeo, cabinMat);
        carCabinMesh.position.set(0, 0.68, -0.1);
        carGroup.add(carCabinMesh);

        // 4 heavy cybernetic wheels or hover thursters
        const isHover = activeV.id === 'glide';
        const wheelOffsets = [
          [-0.83, 0.52], [0.83, 0.52], 
          [-0.83, -1.25], [0.83, -1.25]
        ];
        wheelOffsets.forEach(([x, z]) => {
          let wheel;
          if (isHover) {
            // Small horizontal glowing discs for hover pads!
            const padGeo = new THREE.CylinderGeometry(0.24, 0.24, 0.08, 12);
            const padMat = new THREE.MeshStandardMaterial({ 
              color: activeV.underglow, 
              emissive: activeV.underglow,
              emissiveIntensity: 0.8,
              roughness: 0.2 
            });
            wheel = new THREE.Mesh(padGeo, padMat);
            wheel.position.set(x * 0.85, 0.08, z);
          } else {
            const wheelGeo = new THREE.CylinderGeometry(0.34, 0.34, 0.30, 16);
            const wheelMat = new THREE.MeshStandardMaterial({ 
              color: 0x09090c, 
              roughness: 0.85 
            });
            wheel = new THREE.Mesh(wheelGeo, wheelMat);
            wheel.rotation.z = Math.PI / 2;
            wheel.position.set(x, 0.12, z);
          }
          carGroup.add(wheel);
          wheelMeshes.push(wheel);
        });

        // Symmetrical lateral thruster wings for hover glide
        if (activeV.id === 'glide') {
          const wingGeo = new THREE.BoxGeometry(0.3, 0.06, 1.6);
          const wingMat = new THREE.MeshStandardMaterial({ color: activeV.color, metalness: 0.8, roughness: 0.2 });
          const leftWing = new THREE.Mesh(wingGeo, wingMat);
          leftWing.position.set(-0.9, 0.26, -0.2);
          const rightWing = new THREE.Mesh(wingGeo, wingMat);
          rightWing.position.set(0.9, 0.26, -0.2);
          carGroup.add(leftWing);
          carGroup.add(rightWing);
        }

        // Bull-bar for VX-TITAN
        if (activeV.id === 'titan') {
          const bumperGeo = new THREE.BoxGeometry(1.45, 0.25, 0.12);
          const bumperMat = new THREE.MeshStandardMaterial({ color: 0x22222a, roughness: 0.8 });
          const bumper = new THREE.Mesh(bumperGeo, bumperMat);
          bumper.position.set(0, 0.26, 1.6);
          carGroup.add(bumper);

          const verticalBarGeo = new THREE.BoxGeometry(0.1, 0.5, 0.1);
          [-0.4, 0.4].forEach(bx => {
            const bar = new THREE.Mesh(verticalBarGeo, bumperMat);
            bar.position.set(bx, 0.38, 1.6);
            carGroup.add(bar);
          });
        }

        // Spoiler for NEON-BLADE
        if (activeV.id === 'blade') {
          const spoilerGeo = new THREE.BoxGeometry(1.58, 0.05, 0.22);
          const spoilerMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.5 });
          const spoiler = new THREE.Mesh(spoilerGeo, spoilerMat);
          spoiler.position.set(0, 0.65, -1.35);
          carGroup.add(spoiler);

          const strutGeo = new THREE.BoxGeometry(0.05, 0.22, 0.05);
          [-0.55, 0.55].forEach(sx => {
            const strut = new THREE.Mesh(strutGeo, spoilerMat);
            strut.position.set(sx, 0.52, -1.35);
            carGroup.add(strut);
          });
        }

        // Neon active underglow bar plane
        const glowPlaneGeo = new THREE.BoxGeometry(1.68, 0.04, 3.15);
        const glowPlaneMat = new THREE.MeshBasicMaterial({ color: activeV.underglow });
        underglowMesh = new THREE.Mesh(glowPlaneGeo, glowPlaneMat);
        underglowMesh.position.y = -0.01;
        carGroup.add(underglowMesh);

        // Active dynamic underglow point source
        underglowPointLight = new THREE.PointLight(activeV.underglow, 1.5, 6);
        underglowPointLight.position.set(0, 0.05, 0);
        carGroup.add(underglowPointLight);

        // Symmetrical headlights
        const headlightOffsets = [[-0.52, 0.52, 1.55], [0.52, 0.52, 1.55]];
        headlightOffsets.forEach(([x, y, z]) => {
          const bulb = new THREE.Mesh(
            new THREE.SphereGeometry(0.07, 8, 8),
            new THREE.MeshBasicMaterial({ color: 0xfffcd8 })
          );
          bulb.position.set(x, y, z);
          carGroup.add(bulb);
        });

        // Symmetrical neon design wings/trim
        const trimOffsets = [[-0.80, 0.46, -0.1], [0.80, 0.46, -0.1]];
        trimOffsets.forEach(([x, y, z]) => {
          const wing = new THREE.Mesh(
            new THREE.BoxGeometry(0.04, 0.07, 2.3),
            new THREE.MeshBasicMaterial({ color: activeV.underglow })
          );
          wing.position.set(x, y, z);
          carGroup.add(wing);
          lateralTrimMeshes.push(wing);
        });
      }

      carGroup.position.set(0, 0.12, CAR_Z);
    };

    buildActiveCar();
    scene.add(carGroup);

    /* ---------- PROCEDURAL AI TRAFFIC GENERATOR ---------- */
    const generateTrafficCarGroup = (type: 'sedan' | 'sports' | 'truck' | 'taxi', carColor: number) => {
      const group = new THREE.Group();

      let bodyGeo: THREE.BoxGeometry;
      let cabinGeo: THREE.BoxGeometry;
      let cabinY = 0.55;
      let cabinZ = -0.1;
      let wheelRadius = 0.31;
      let wheelWidth = 0.24;

      if (type === 'sports') {
        bodyGeo = new THREE.BoxGeometry(1.5, 0.35, 3.1);
        cabinGeo = new THREE.BoxGeometry(1.1, 0.35, 1.3);
        cabinY = 0.48;
        cabinZ = -0.15;
        // Add a rear spoiler wing
        const spoilerGeo = new THREE.BoxGeometry(1.5, 0.06, 0.25);
        const spoilerMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.5 });
        const spoiler = new THREE.Mesh(spoilerGeo, spoilerMat);
        spoiler.position.set(0, 0.6, -1.35);
        group.add(spoiler);

        // Spoiler struts
        const strutGeo = new THREE.BoxGeometry(0.06, 0.25, 0.06);
        [-0.5, 0.5].forEach(sx => {
          const strut = new THREE.Mesh(strutGeo, spoilerMat);
          strut.position.set(sx, 0.45, -1.35);
          group.add(strut);
        });
      } else if (type === 'truck') {
        bodyGeo = new THREE.BoxGeometry(1.65, 0.65, 3.4);
        cabinGeo = new THREE.BoxGeometry(1.4, 0.55, 1.8);
        cabinY = 0.9;
        cabinZ = 0.45; // Cab forward SUV/truck style
        wheelRadius = 0.38; // bigger heavy tires
        wheelWidth = 0.32;

        // Bed/cargo box details for pickup truck
        const bedGeo = new THREE.BoxGeometry(1.5, 0.4, 1.4);
        const bedMat = new THREE.MeshStandardMaterial({ color: 0x22222a });
        const bed = new THREE.Mesh(bedGeo, bedMat);
        bed.position.set(0, 0.7, -0.85);
        group.add(bed);
      } else if (type === 'taxi') {
        bodyGeo = new THREE.BoxGeometry(1.48, 0.46, 2.95);
        cabinGeo = new THREE.BoxGeometry(1.05, 0.40, 1.4);
        cabinY = 0.58;
        
        // Taxi top sign
        const signGeo = new THREE.BoxGeometry(0.35, 0.16, 0.16);
        const signMat = new THREE.MeshBasicMaterial({ color: 0xffb703 }); // Glowing amber taxi sign
        const sign = new THREE.Mesh(signGeo, signMat);
        sign.position.set(0, 0.86, -0.15);
        group.add(sign);
      } else { // 'sedan'
        bodyGeo = new THREE.BoxGeometry(1.5, 0.45, 3.0);
        cabinGeo = new THREE.BoxGeometry(1.1, 0.4, 1.45);
        cabinY = 0.58;
      }

      // 1. Car main body mesh
      const bodyMat = new THREE.MeshStandardMaterial({ 
        color: carColor, 
        metalness: 0.65, 
        roughness: 0.35 
      });
      const bodyMesh = new THREE.Mesh(bodyGeo, bodyMat);
      bodyMesh.position.y = bodyGeo.parameters.height / 2 + 0.12;
      group.add(bodyMesh);

      // 2. Car glass cabin
      const cabinMat = new THREE.MeshStandardMaterial({
        color: 0x090a0f,
        roughness: 0.1,
        metalness: 0.9,
        transparent: true,
        opacity: 0.7
      });
      const cabinMesh = new THREE.Mesh(cabinGeo, cabinMat);
      cabinMesh.position.set(0, cabinY, cabinZ);
      group.add(cabinMesh);

      // 3. Four wheels (cylinders)
      const wZOffsets = type === 'truck' ? [0.95, -1.1] : [0.8, -1.0];
      const wXOffset = type === 'truck' ? 0.88 : 0.82;
      const wheelOffsets = [
        [-wXOffset, wZOffsets[0]], [wXOffset, wZOffsets[0]], 
        [-wXOffset, wZOffsets[1]], [wXOffset, wZOffsets[1]]
      ];
      const wheelMat = new THREE.MeshStandardMaterial({ color: 0x111116, roughness: 0.85 });
      wheelOffsets.forEach(([wx, wz]) => {
        const wheelGeo = new THREE.CylinderGeometry(wheelRadius, wheelRadius, wheelWidth, 12);
        const wheel = new THREE.Mesh(wheelGeo, wheelMat);
        wheel.rotation.z = Math.PI / 2;
        wheel.position.set(wx, wheelRadius * 0.9, wz);
        group.add(wheel);
      });

      // 4. Symmetrical Headlights
      const hZ = type === 'truck' ? 1.72 : 1.52;
      const hY = type === 'truck' ? 0.65 : 0.45;
      const hX = type === 'truck' ? 0.58 : 0.52;
      [[-hX, hY, hZ], [hX, hY, hZ]].forEach(([hx, hy, hz]) => {
        const bulb = new THREE.Mesh(
          new THREE.SphereGeometry(0.08, 6, 6),
          new THREE.MeshBasicMaterial({ color: 0xfffeed })
        );
        bulb.position.set(hx, hy, hz);
        group.add(bulb);
      });

      // 5. Red Tail lights
      const tZ = type === 'truck' ? -1.72 : -1.52;
      const tY = type === 'truck' ? 0.65 : 0.45;
      const tX = type === 'truck' ? 0.58 : 0.52;
      [[-tX, tY, tZ], [tX, tY, tZ]].forEach(([tx, ty, tz]) => {
        const bulb = new THREE.Mesh(
          new THREE.BoxGeometry(0.18, 0.08, 0.04),
          new THREE.MeshBasicMaterial({ color: 0xff0033 })
        );
        bulb.position.set(tx, ty, tz);
        group.add(bulb);
      });

      // 6. Glowing underglow plane
      const glowGeo = new THREE.BoxGeometry(bodyGeo.parameters.width - 0.1, 0.03, bodyGeo.parameters.depth - 0.2);
      const glowColor = type === 'sports' ? 0x00f0ff : (type === 'taxi' ? 0xffb703 : 0xff2ec4);
      const glowMat = new THREE.MeshBasicMaterial({ color: glowColor });
      const glow = new THREE.Mesh(glowGeo, glowMat);
      glow.position.y = 0.01;
      group.add(glow);

      return group;
    };

    /* ---------- TRAFFIC AI VEHICLES POOL ---------- */
    const TRAFFIC_COUNT = 8;
    const trafficPool: { 
      mesh: THREE.Group; 
      active: boolean; 
      lane: number; 
      speed: number; 
      type: 'sedan' | 'sports' | 'truck' | 'taxi';
      color: number;
    }[] = [];

    const trafficColors = [
      0xff2ec4, // Hot Pink
      0x00f0ff, // Electric Cyan
      0xffb703, // Amber Gold
      0x7b2ff7, // Purple
      0x00ff66, // Green
      0xff3300, // Crimson Red
      0xe0e0e0  // Silver
    ];

    const trafficTypes: ('sedan' | 'sports' | 'truck' | 'taxi')[] = ['sedan', 'sports', 'truck', 'taxi'];

    for (let i = 0; i < TRAFFIC_COUNT; i++) {
      const type = trafficTypes[i % trafficTypes.length];
      const color = trafficColors[Math.floor(Math.random() * trafficColors.length)];
      
      const mesh = generateTrafficCarGroup(type, color);
      mesh.visible = false;
      scene.add(mesh);

      trafficPool.push({
        mesh,
        active: false,
        lane: 1,
        speed: 15,
        type,
        color
      });
    }

    const triggerTrafficSpawn = () => {
      const free = trafficPool.find(t => !t.active);
      if (!free) return;

      const randomLane = Math.floor(Math.random() * 3);
      
      // Ensure we don't spawn two active cars at the exact same lane close to each other
      const laneOccupiedNearHorizon = trafficPool.some(t => t.active && t.lane === randomLane && Math.abs(t.mesh.position.z - SPAWN_FAR_Z) < 30);
      if (laneOccupiedNearHorizon) {
        const alternativeLanes = [0, 1, 2].filter(l => l !== randomLane);
        const altLane = alternativeLanes[Math.floor(Math.random() * alternativeLanes.length)];
        const altOccupied = trafficPool.some(t => t.active && t.lane === altLane && Math.abs(t.mesh.position.z - SPAWN_FAR_Z) < 30);
        if (altOccupied) return; // skip spawn this frame
        free.lane = altLane;
      } else {
        free.lane = randomLane;
      }

      free.mesh.position.x = LANE_X[free.lane];

      // Decide if this will be a slow car or a fast car
      const isSlower = Math.random() > 0.4 || activeSpeed < 22;

      if (isSlower) {
        // Slower car: drives forward at its own speed (slower than player)
        // Spawn far ahead at the horizon so the player has to catch up and steer around it
        free.speed = 10 + Math.random() * 8; // absolute speed e.g. 10-18 units/s
        free.mesh.position.z = SPAWN_FAR_Z - Math.random() * 20;
      } else {
        // Faster car: drives forward at its own speed (faster than player)
        // Spawn behind the player so it catches up and zooms past them
        free.speed = activeSpeed + 12 + Math.random() * 10; // absolute speed faster than player
        free.mesh.position.z = CAR_Z + 40 + Math.random() * 15; // spawn behind camera
        
        // Ensure it doesn't immediately spawn in the same lane as the player to avoid sudden rear collision
        if (free.lane === playerTargetLaneIndex) {
          const alternativeLanes = [0, 1, 2].filter(l => l !== playerTargetLaneIndex);
          free.lane = alternativeLanes[Math.floor(Math.random() * alternativeLanes.length)];
          free.mesh.position.x = LANE_X[free.lane];
        }
      }

      free.mesh.visible = true;
      free.active = true;
    };

    const clearAllTraffic = () => {
      trafficPool.forEach(t => {
        t.active = false;
        t.mesh.visible = false;
      });
    };

    /* ---------- ENGINE RUNTIME STATE ---------- */
    let activeSpeed = IDLE_SPEED;
    let activeScore = 0;
    let activeTimeElapsed = 0;
    let playerTargetLaneIndex = 1;
    let spawnCountdown = 0.0;
    let currentSpawnInterval = 1.35;
    let internalGameState: 'title' | 'playing' | 'gameover' = 'title';

    // Screen shake variables for collision visual response
    let cameraShakeIntensity = 0.0;

    /* ---------- CORE LOOP LOGIC ---------- */
    const internalClock = new THREE.Clock();
    let requestID: number;

    const renderLoop = () => {
      requestID = requestAnimationFrame(renderLoop);
      const dt = Math.min(internalClock.getDelta(), 0.05); // Caps delta to prevent skips on background tabs
      const clockTotalTime = internalClock.getElapsedTime();

      const isPaused = pausedRef.current;
      const effectiveDt = isPaused ? 0 : dt;

      // Adjust game values depending on external state hooks
      if (internalGameState === 'playing') {
        if (!isPaused) {
          activeTimeElapsed += dt;
          
          // Base vehicle stats adjust velocity ramp limits
          const vehicle = activeVehicleRef.current;
          const currentMaxLimit = MAX_SPEED * vehicle.speedMultiplier;
          
          activeSpeed = Math.min(currentMaxLimit, BASE_SPEED + activeTimeElapsed * SPEED_RAMP);
          
          // Accumulate active score based on speed
          activeScore += activeSpeed * dt * 1.2;
          setScore(Math.floor(activeScore));
          setSpeed(activeSpeed);

          // Update synthesized sound
          synth.updateEngine(activeSpeed);

          // Adjust spawn speed intervals
          currentSpawnInterval = Math.max(0.6, 1.45 - activeTimeElapsed * 0.015);
          spawnCountdown -= dt;
          if (spawnCountdown <= 0) {
            triggerTrafficSpawn();
            spawnCountdown = currentSpawnInterval;
          }
        }
      } else if (internalGameState === 'gameover') {
        // Friction dampening decelerate
        activeSpeed *= 0.93;
        setSpeed(activeSpeed);
        synth.updateEngine(activeSpeed);
        if (activeSpeed < 0.1) activeSpeed = 0;
      } else {
        // Idle demo cruise speed
        activeSpeed = IDLE_SPEED;
        setSpeed(activeSpeed);
      }

      // 1. Move Infinite Road Segments and update lighting
      const zoneState = getZoneAtDistance(activeScore);
      const currentLit = ZONE_LIGHTING[zoneState.current];
      const nextLit = ZONE_LIGHTING[zoneState.next];
      const transitionFactor = zoneState.factor;

      const activeFogColor = lerpColor(currentLit.fogColor, nextLit.fogColor, transitionFactor);
      const activeAmbientColor = lerpColor(currentLit.ambientColor, nextLit.ambientColor, transitionFactor);
      const activeAmbientIntensity = lerpNum(currentLit.ambientIntensity, nextLit.ambientIntensity, transitionFactor);
      const activeHemiSky = lerpColor(currentLit.hemisphereSky, nextLit.hemisphereSky, transitionFactor);
      const activeHemiGround = lerpColor(currentLit.hemisphereGround, nextLit.hemisphereGround, transitionFactor);
      const activeHemiIntensity = lerpNum(currentLit.hemisphereIntensity, nextLit.hemisphereIntensity, transitionFactor);
      const activeSunColor = lerpColor(currentLit.sunColor, nextLit.sunColor, transitionFactor);
      const activeSunOpacity = lerpNum(currentLit.sunOpacity, nextLit.sunOpacity, transitionFactor);
      const activeStarOpacity = lerpNum(currentLit.starOpacity, nextLit.starOpacity, transitionFactor);

      if (scene.fog) {
        scene.fog.color.copy(activeFogColor);
      }
      renderer.setClearColor(activeFogColor);
      ambientLight.color.copy(activeAmbientColor);
      ambientLight.intensity = activeAmbientIntensity;

      hemisphereLight.color.copy(activeHemiSky);
      hemisphereLight.groundColor.copy(activeHemiGround);
      hemisphereLight.intensity = activeHemiIntensity;

      const sunMaterial = horizonSun.material as THREE.MeshBasicMaterial;
      sunMaterial.color.copy(activeSunColor);
      sunMaterial.opacity = activeSunOpacity;

      starMaterial.opacity = activeStarOpacity;

      roadSegments.forEach(seg => {
        seg.position.z += activeSpeed * effectiveDt;
        // Reset segment to back of queue when it exits behind the camera
        if (seg.position.z - SEG_LEN / 2 > camera.position.z + 4) {
          seg.position.z -= NUM_SEGMENTS * SEG_LEN;

          // Re-populate scenery for recycled segment
          const segmentDistance = activeScore + (CAR_Z - seg.position.z);
          populateSceneryForSegment(seg, segmentDistance);
        }
      });

      // Update Dynamic Train inside Countryside Zone
      if (internalGameState === 'playing' && !isPaused) {
        if (zoneState.current === 1) {
          if (!trainActive) {
            trainCooldown -= dt;
            if (trainCooldown <= 0) {
              trainActive = true;
              trainZ = CAR_Z + 120; // Spawn behind camera
              trainSpeed = activeSpeed + 25; // Speeding past
              if (trainGroup) {
                trainGroup.position.z = trainZ;
                trainGroup.visible = true;
              }
            }
          } else {
            // Move train forward relatives to camera (since it's faster than player)
            trainZ += (activeSpeed - trainSpeed) * dt;
            if (trainGroup) {
              trainGroup.position.z = trainZ;
              // Deactivate train when it goes far ahead of player
              if (trainZ < CAR_Z - 300) {
                trainActive = false;
                trainGroup.visible = false;
                trainCooldown = 15.0 + Math.random() * 10;
              }
            }
          }
        } else {
          // Hide train in other zones
          if (trainActive) {
            trainActive = false;
            if (trainGroup) trainGroup.visible = false;
          }
          trainCooldown = 2.0;
        }
      }

      // 2. Animate and Check Traffic Cars
      if (internalGameState === 'playing') {
        trafficPool.forEach(trafficCar => {
          if (!trafficCar.active) return;

          // Propel relative to players frame
          trafficCar.mesh.position.z += (activeSpeed - trafficCar.speed) * effectiveDt;

          // Simple evasion AI: if a fast car approaches the player from behind in the same lane,
          // it changes lanes to safely overtake the player.
          if (!isPaused && trafficCar.speed > activeSpeed && trafficCar.mesh.position.z > CAR_Z && trafficCar.mesh.position.z < CAR_Z + 18) {
            const isSameLane = Math.abs(trafficCar.mesh.position.x - carGroup.position.x) < 1.5;
            if (isSameLane) {
              const alternativeLanes = [0, 1, 2].filter(l => l !== playerTargetLaneIndex);
              const newLane = alternativeLanes[Math.floor(Math.random() * alternativeLanes.length)];
              trafficCar.lane = newLane;
              trafficCar.mesh.position.x = LANE_X[newLane];
            }
          }

          // Align wheels spinning according to traffic speed
          if (!isPaused) {
            trafficCar.mesh.children.forEach(child => {
              if (child instanceof THREE.Mesh && child.geometry instanceof THREE.CylinderGeometry && child.material instanceof THREE.MeshStandardMaterial) {
                child.rotation.x += trafficCar.speed * dt * 0.35;
              }
            });
          }

          // Collision detection thresholds
          const diffZ = Math.abs(trafficCar.mesh.position.z - CAR_Z);
          const diffX = Math.abs(trafficCar.mesh.position.x - carGroup.position.x);

          // Standard crash bounding hit boxes
          if (diffZ < 2.5 && diffX < 0.95) {
            // CRASH HIT!
            synth.playCrash();
            cameraShakeIntensity = 0.55; // Screen shake trigger
            
            internalGameState = 'gameover';
            setGameState('gameover');
            synth.stopEngine();

            // Check new high score and save
            const finalScoreVal = Math.floor(activeScore);
            const savedHigh = parseInt(localStorage.getItem('neon_rush_highscore') || '0', 10);
            if (finalScoreVal > savedHigh) {
              saveHighScore(finalScoreVal);
            }
          }

          // Deactivate passed traffic
          if (trafficCar.mesh.position.z > camera.position.z + 10) {
            trafficCar.active = false;
            trafficCar.mesh.visible = false;
            if (trafficCar.speed < activeSpeed) {
              setDodgeCount(prev => prev + 1);
            }
          }
          
          // Deactivate zoom-ahead traffic
          if (trafficCar.mesh.position.z < SPAWN_FAR_Z - 30) {
            trafficCar.active = false;
            trafficCar.mesh.visible = false;
          }
        });
      }

      // 3. Car lateral transition interpolation
      const currentVehicle = activeVehicleRef.current;
      const targetX = LANE_X[playerTargetLaneIndex];
      const previousX = carGroup.position.x;
      
      // Shift interpolation according to current vehicle's agility rating
      if (!isPaused) {
        carGroup.position.x += (targetX - carGroup.position.x) * Math.min(1, dt * currentVehicle.shiftSpeed);
        
        // Calculate lateral speed velocity for roll rotation tilt effects
        const latSpeed = (carGroup.position.x - previousX) / Math.max(dt, 0.0001);
        carGroup.rotation.z += (-(latSpeed * 0.028) - carGroup.rotation.z) * 0.18;
        
        // Hovering micro-bobbing animation
        carGroup.position.y = 0.12 + Math.sin(clockTotalTime * 8) * 0.022;

        // Spin tires slightly if playing/cruising
        wheelMeshes.forEach(wheel => {
          wheel.rotation.x += activeSpeed * dt * 0.35;
        });
      }

      // 4. Camera control transitions
      let shakeOffsetX = 0;
      let shakeOffsetY = 0;
      if (cameraShakeIntensity > 0.01) {
        shakeOffsetX = (Math.random() - 0.5) * cameraShakeIntensity;
        shakeOffsetY = (Math.random() - 0.5) * cameraShakeIntensity;
        cameraShakeIntensity *= 0.9; // damp
      }

      // Third-person chase camera setup positioned behind and slightly above the player's car
      const targetCamX = carGroup.position.x * 0.92; 
      const targetCamY = 1.85 + Math.sin(clockTotalTime * 3) * 0.01 + shakeOffsetY;
      const targetCamZ = CAR_Z + 4.8;

      camera.position.x += (targetCamX - camera.position.x) * 0.18;
      camera.position.x += shakeOffsetX;
      camera.position.y += (targetCamY - camera.position.y) * 0.18;
      camera.position.z += (targetCamZ - camera.position.z) * 0.18;
      
      // Speed visual FOV warping
      const targetFOV = 72 + (activeSpeed / MAX_SPEED) * 15;
      camera.fov += (targetFOV - camera.fov) * 0.08;
      camera.updateProjectionMatrix();

      // Looking down the road ahead, slightly tracking player's lateral movement
      camera.lookAt(new THREE.Vector3(carGroup.position.x * 0.4, 0.55, CAR_Z - 35.0));

      renderer.render(scene, camera);
    };

    // Begin Animation Loop
    renderLoop;
    renderLoop();

    /* ---------- PUBLIC API FOR HOOK INTERACTION ---------- */
    gameLoopRef.current = {
      updateCarMaterials: (vehicle: Vehicle) => {
        buildActiveCar();
      },
      resetGame: () => {
        internalGameState = 'playing';
        activeScore = 0;
        activeSpeed = BASE_SPEED;
        activeTimeElapsed = 0;
        playerTargetLaneIndex = 1;
        spawnCountdown = 0.0;
        currentSpawnInterval = 1.35;
        carGroup.position.x = 0;
        carGroup.rotation.z = 0;
        clearAllTraffic();

        // Reset dynamic train tracking
        trainActive = false;
        trainCooldown = 2.0;
        if (trainGroup) {
          trainGroup.visible = false;
          trainGroup.position.set(-15, 0.1, -1000);
        }

        // Re-populate all segment sceneries to starting position values
        roadSegments.forEach((seg, i) => {
          seg.position.z = segmentStartZ - i * SEG_LEN;
          const segmentDistance = CAR_Z - seg.position.z;
          populateSceneryForSegment(seg, segmentDistance);
        });
      },
      changeLaneLeft: () => {
        if (internalGameState !== 'playing' || pausedRef.current) return;
        playerTargetLaneIndex = Math.max(0, playerTargetLaneIndex - 1);
        synth.playShift();
      },
      changeLaneRight: () => {
        if (internalGameState !== 'playing' || pausedRef.current) return;
        playerTargetLaneIndex = Math.min(2, playerTargetLaneIndex + 1);
        synth.playShift();
      },
      setExternalState: (state: 'title' | 'playing' | 'gameover') => {
        internalGameState = state;
      }
    };

    /* ---------- INPUT EVENT LISTENERS ---------- */
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['ArrowLeft', 'KeyA'].includes(e.code)) {
        gameLoopRef.current?.changeLaneLeft();
      }
      if (['ArrowRight', 'KeyD'].includes(e.code)) {
        gameLoopRef.current?.changeLaneRight();
      }
      if (['KeyP', 'Pause'].includes(e.code)) {
        if (internalGameState === 'playing') {
          setPaused(p => !p);
        }
      }
      if (['Space', 'Enter'].includes(e.code)) {
        if (internalGameState === 'title' || internalGameState === 'gameover') {
          startGame();
        } else if (internalGameState === 'playing') {
          // Space bar pauses when playing
          setPaused(p => !p);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    // CLEANUP DISPOSAL
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      resizeObserver.disconnect();
      cancelAnimationFrame(requestID);
      renderer.dispose();
      synth.stopEngine();
    };
  }, []);

  // Sync core Game State to Three Loop Ref on component state change
  useEffect(() => {
    if (gameLoopRef.current && typeof gameLoopRef.current.setExternalState === 'function') {
      gameLoopRef.current.setExternalState(gameState);
    }
  }, [gameState]);

  // Handle active leaderboards update
  useEffect(() => {
    // Dynamic insert of current player score or high score
    const players = [
      { name: 'HYPER_V', score: 142092 },
      { name: 'NULL_POINTER', score: 128440 },
      { name: 'GHOST_SHELL', score: 115201 },
      { name: 'DATA_DRIFT', score: 98332 },
      { name: 'CYBER_PUNK', score: 87110 }
    ];

    const playerScore = Math.max(score, highScore);
    const existingPlayerIndex = players.findIndex(p => p.name === username);
    
    if (existingPlayerIndex !== -1) {
      players[existingPlayerIndex].score = playerScore;
    } else if (playerScore > 0) {
      players.push({ name: username, score: playerScore });
    }

    // Sort descending
    players.sort((a, b) => b.score - a.score);
    // Take top 5
    setLeaderboard(players.slice(0, 5));
  }, [score, highScore, username]);

  const activeVehicle = VEHICLES.find(v => v.id === selectedVehicleId) || VEHICLES[0];
  const progressToObjective = Math.min(100, Math.floor((dodgeCount / 15) * 100));

  return (
    <div className="w-full h-screen bg-[#05050b] text-[#eaf7ff] font-sans flex flex-col overflow-hidden select-none" id="root-container">
      
      {/* ---------- TOP NAVIGATION BAR ---------- */}
      <nav className="h-16 border-b border-[#00f0ff]/20 px-8 flex items-center justify-between bg-[#07070f] z-20 shrink-0" id="top-nav">
        <div className="flex items-center gap-4">
          <div className="w-8 h-8 bg-gradient-to-br from-[#00f0ff] to-[#ff2ec4] rounded-sm rotate-45 flex items-center justify-center animate-pulse">
            <div className="w-4 h-4 bg-[#05050b] rounded-sm"></div>
          </div>
          <div className="flex flex-col">
            <span className="text-xl font-black tracking-widest text-white font-orbitron">NEON RUSH</span>
            <span className="text-[9px] tracking-[0.2em] text-[#00f0ff]/80 font-mono -mt-1">GRID RACER 3D</span>
          </div>
        </div>

        {/* System tabs (Simulated protocols) */}
        <div className="hidden md:flex gap-8 text-xs font-semibold tracking-wider uppercase font-rajdhani">
          <div className="text-[#00f0ff] border-b-2 border-[#00f0ff] pb-1 cursor-pointer flex items-center gap-1.5">
            <Compass className="w-3.5 h-3.5 animate-spin-slow text-[#00f0ff]" />
            <span>The Grid</span>
          </div>
          <div className="text-white/60 hover:text-[#00f0ff] transition-colors cursor-pointer flex items-center gap-1.5" onClick={() => {
            const container = document.getElementById('garage-section');
            container?.scrollIntoView({ behavior: 'smooth' });
          }}>
            <Cpu className="w-3.5 h-3.5" />
            <span>Garage</span>
          </div>
          <div className="text-white/60 hover:text-[#00f0ff] transition-colors cursor-pointer flex items-center gap-1.5" onClick={() => {
            const container = document.getElementById('leaderboard-section');
            container?.scrollIntoView({ behavior: 'smooth' });
          }}>
            <Trophy className="w-3.5 h-3.5" />
            <span>Leaderboard</span>
          </div>
        </div>

        {/* Audio Sync & Profile CodeName */}
        <div className="flex items-center gap-5">
          <button 
            className="p-1.5 rounded bg-white/5 border border-white/10 hover:border-[#00f0ff]/50 text-white/70 hover:text-[#00f0ff] transition-all cursor-pointer flex items-center justify-center" 
            onClick={() => setMuted(!muted)}
            title={muted ? "Unmute Audio" : "Mute Audio"}
            id="audio-toggle"
          >
            {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4 animate-pulse" />}
          </button>

          <div className="flex items-center gap-3">
            <div className="text-right">
              <div className="text-[10px] uppercase text-white/50 tracking-wider">DRIVER PROFILE</div>
              {isEditingName ? (
                <div className="flex items-center gap-1">
                  <input
                    type="text"
                    value={nameInput}
                    onChange={(e) => setNameInput(e.target.value.toUpperCase())}
                    className="bg-black/80 border border-[#00f0ff] text-xs px-2 py-0.5 rounded text-white font-mono w-24 focus:outline-none"
                    maxLength={12}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSaveUsername();
                      if (e.key === 'Escape') setIsEditingName(false);
                    }}
                    autoFocus
                  />
                  <button 
                    onClick={handleSaveUsername}
                    className="text-[10px] text-green-400 bg-green-900/40 px-1.5 py-0.5 rounded border border-green-500/30 hover:bg-green-400 hover:text-black transition-all cursor-pointer"
                  >
                    SAVE
                  </button>
                </div>
              ) : (
                <div 
                  className="text-xs font-bold text-[#00f0ff] font-mono hover:underline cursor-pointer flex items-center gap-1 justify-end"
                  onClick={() => {
                    setNameInput(username);
                    setIsEditingName(true);
                  }}
                  title="Click to edit callsign"
                >
                  <span>{username}</span>
                  <span className="text-[9px] opacity-40 font-normal">(EDIT)</span>
                </div>
              )}
            </div>
            <div className="w-9 h-9 rounded-full border border-[#ff2ec4]/60 bg-[#12121f] flex items-center justify-center overflow-hidden shadow-[0_0_10px_rgba(255,46,196,0.25)]">
              <User className="w-4 h-4 text-[#ff2ec4]" />
            </div>
          </div>
        </div>
      </nav>

      {/* ---------- MAIN GRID BODY ---------- */}
      <main className="flex-1 flex flex-col lg:flex-row overflow-hidden min-h-0" id="main-content">
        
        {/* LEFT COLUMN: GLOBAL LEADERBOARD & PROTOCOL OBJECTIVES */}
        <aside className="w-full lg:w-72 border-b lg:border-b-0 lg:border-r border-[#00f0ff]/10 bg-[#07070f]/75 p-5 flex flex-col shrink-0 overflow-y-auto" id="leaderboard-section">
          <div className="flex items-center gap-2 mb-4 border-b border-white/5 pb-2">
            <Trophy className="w-4 h-4 text-[#00f0ff]" />
            <h3 className="text-xs font-bold text-[#00f0ff] tracking-[0.2em] uppercase font-orbitron">Top Seekers</h3>
          </div>
          
          <div className="space-y-3 flex-1 min-h-[140px]">
            {leaderboard.map((item, index) => {
              const isCurrentUser = item.name === username;
              return (
                <div 
                  key={`${item.name}-${index}`}
                  className={`flex items-center justify-between p-2.5 rounded transition-all ${
                    isCurrentUser 
                      ? 'bg-[#ff2ec4]/10 border-l-3 border-[#ff2ec4] shadow-[0_0_12px_rgba(255,46,196,0.15)] text-white' 
                      : 'bg-white/5 border-l-2 border-[#00f0ff]/40 opacity-80 hover:opacity-100 hover:bg-white/10'
                  }`}
                  id={`leaderboard-item-${index}`}
                >
                  <div className="flex items-center gap-2 font-mono">
                    <span className="text-[10px] text-white/40">{String(index + 1).padStart(2, '0')}.</span>
                    <span className="text-xs font-semibold tracking-wider">{item.name}</span>
                  </div>
                  <span className={`text-xs font-mono font-bold ${isCurrentUser ? 'text-[#ff2ec4]' : 'text-[#00f0ff]'}`}>
                    {item.score.toLocaleString()}M
                  </span>
                </div>
              );
            })}
          </div>

          {/* Daily Objective Progress */}
          <div className="mt-5 border-t border-white/5 pt-4">
            <div className="p-4 rounded border border-dashed border-[#00f0ff]/20 bg-[#12121f]/45">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] text-[#00f0ff] font-orbitron uppercase tracking-widest flex items-center gap-1">
                  <Target className="w-3 h-3 text-[#00f0ff]" /> Daily Objective
                </span>
                <span className="text-[10px] text-[#ffb703] font-mono">{dodgeCount}/15</span>
              </div>
              <p className="text-xs text-white/70 leading-relaxed mb-3">
                Dodge 15 debris obstacle signatures without a grid system overload.
              </p>
              
              <div className="h-2 w-full bg-white/10 rounded-full overflow-hidden relative">
                <div 
                  className="h-full bg-gradient-to-r from-[#00f0ff] to-[#ff2ec4] transition-all duration-300 rounded-full"
                  style={{ width: `${progressToObjective}%` }}
                ></div>
              </div>
              
              {progressToObjective >= 100 ? (
                <div className="mt-2.5 text-[10px] font-bold text-green-400 flex items-center gap-1.5 animate-bounce">
                  <Award className="w-3.5 h-3.5" /> SECURE GRID CLEARED (+500 XP)
                </div>
              ) : (
                <div className="mt-1.5 text-[9px] text-white/40 font-mono text-right">
                  REWARD: OVERCLOCKED CORES
                </div>
              )}
            </div>
          </div>
        </aside>

        {/* CENTER COLUMN: ACTIVE 3D GAMEPLAY VIEW */}
        <section className="flex-1 relative p-4 sm:p-6 lg:p-8 flex flex-col min-w-0" id="gameplay-viewport">
          <div 
            ref={containerRef}
            className="w-full h-full rounded-xl border border-[#00f0ff]/20 bg-gradient-to-b from-[#12121f] to-[#05050b] relative overflow-hidden flex flex-col shadow-[inset_0_0_40px_rgba(0,240,255,0.06)]"
            id="game-frame-container"
          >
            {/* Real WebGL Canvas Render Element */}
            <canvas ref={canvasRef} className="absolute inset-0 w-full h-full block" id="gameCanvas" />

            {/* --- IN-GAME OVERLAY STATS / HUD --- */}
            <div className={`absolute inset-x-0 top-0 p-5 pointer-events-none flex justify-between items-start font-orbitron transition-all duration-300 ${gameState === 'playing' ? 'opacity-100' : 'opacity-0'}`}>
              <div className="flex items-center gap-4 pointer-events-auto" id="hud-score-display">
                <button 
                  onClick={() => setPaused(!paused)}
                  className="w-10 h-10 rounded-full bg-black/75 border border-[#00f0ff]/30 text-[#00f0ff] hover:text-white hover:border-white transition-all flex items-center justify-center cursor-pointer pointer-events-auto shadow-[0_0_10px_rgba(0,240,255,0.25)]"
                  title={paused ? "Resume Drive" : "Pause Drive"}
                  id="hud-pause-btn"
                >
                  {paused ? <Play className="w-5 h-5 fill-current" /> : <Pause className="w-5 h-5 fill-current" />}
                </button>
                <div className="flex flex-col justify-center">
                  <div className="text-[9px] tracking-[0.2em] text-[#00f0ff]/80 uppercase font-mono">DISTANCE</div>
                  <div className="text-2xl font-black text-white drop-shadow-[0_0_10px_rgba(0,240,255,0.5)]">
                    {score} <span className="text-xs font-bold text-white/60">m</span>
                  </div>
                </div>
              </div>

              <div className="flex flex-col items-end text-right" id="hud-speed-display">
                <div className="text-[9px] tracking-[0.2em] text-[#ff2ec4]/80 uppercase font-mono">SCORE</div>
                <div className="text-2xl font-black text-white drop-shadow-[0_0_10px_rgba(255,46,196,0.5)] leading-none">
                  {Math.round(score * 12.5)}
                </div>
                
                {/* Speed right below score in red/orange */}
                <div className="text-[9px] tracking-[0.15em] text-[#ff3300]/80 uppercase font-mono mt-2">SPEED</div>
                <div className="text-lg font-black text-[#ff4500] drop-shadow-[0_0_8px_rgba(255,69,0,0.5)] leading-none">
                  {Math.round(speed * 6.5)} <span className="text-xs font-bold text-white">KM/H</span>
                </div>
              </div>
            </div>

            {/* --- OVERLAY: PAUSED SCREEN --- */}
            {paused && gameState === 'playing' && (
              <div className="absolute inset-0 bg-black/70 backdrop-blur-xs flex flex-col items-center justify-center p-6 text-center z-20 pointer-events-auto" id="paused-screen-overlay">
                <div className="max-w-md animate-fade-in">
                  <h2 className="text-5xl font-black italic tracking-tighter text-[#00f0ff] font-orbitron drop-shadow-[0_0_20px_rgba(0,240,255,0.8)] animate-pulse">
                    SYSTEM PAUSED
                  </h2>
                  <p className="mt-2 text-white/70 uppercase tracking-[0.25em] text-xs font-semibold">
                    NEURAL GRID HOVERING
                  </p>
                  
                  <div className="mt-6 p-4 rounded bg-[#07070f]/95 border border-[#00f0ff]/30 text-xs text-white/80 space-y-3 font-rajdhani">
                    <p className="text-xs">SYSTEM CHASSIS TEMPERATURE STATUS: STABLE</p>
                    <div className="flex justify-center items-center gap-2">
                      <kbd className="px-2 py-1 bg-white/10 rounded border border-white/20 font-mono text-[10px]">SPACE</kbd>
                      <span className="text-white/40">or</span>
                      <kbd className="px-2 py-1 bg-white/10 rounded border border-white/20 font-mono text-[10px]">P</kbd>
                      <span className="text-white/60">to resume</span>
                    </div>
                  </div>

                  <button 
                    onClick={() => setPaused(false)}
                    className="mt-8 px-10 py-3 bg-white text-black font-black rounded-full hover:scale-105 transition-all shadow-[0_0_25px_rgba(255,255,255,0.45)] cursor-pointer text-sm font-orbitron tracking-widest"
                  >
                    RESUME DRIVE
                  </button>
                </div>
              </div>
            )}

            {/* --- OVERLAY: TITLE SCREEN --- */}
            {gameState === 'title' && (
              <div className="absolute inset-0 bg-black/60 backdrop-blur-xs flex flex-col items-center justify-center p-6 text-center z-10" id="title-screen-overlay">
                <div className="max-w-md">
                  <h1 className="text-5xl sm:text-6xl font-black italic tracking-tighter text-white font-orbitron drop-shadow-[0_0_25px_rgba(255,46,196,0.9)] animate-pulse">
                    NEON RUSH
                  </h1>
                  <p className="mt-2 text-[#00f0ff] tracking-[0.35em] uppercase text-xs sm:text-sm font-semibold font-orbitron">
                    NEURAL CONNECTION SYNCED
                  </p>
                  
                  <div className="mt-6 p-4 rounded bg-[#07070f]/90 border border-[#00f0ff]/20 text-xs text-white/80 space-y-2.5 font-rajdhani">
                    <p className="text-sm font-semibold text-[#ff2ec4]">CONTROLS INTERACTIVE PROTOCOL:</p>
                    <div className="flex justify-center items-center gap-4 py-1.5">
                      <div className="flex items-center gap-1.5">
                        <kbd className="px-2 py-1 bg-white/10 rounded border border-white/20 font-mono text-xs">←</kbd>
                        <kbd className="px-2 py-1 bg-white/10 rounded border border-white/20 font-mono text-xs">→</kbd>
                        <span className="text-white/60">or</span>
                        <kbd className="px-2 py-1 bg-white/10 rounded border border-white/20 font-mono text-xs">A</kbd>
                        <kbd className="px-2 py-1 bg-white/10 rounded border border-white/20 font-mono text-xs">D</kbd>
                      </div>
                      <span className="text-[#00f0ff]">/</span>
                      <span className="text-white/70">Tap On-Screen Arrows Below</span>
                    </div>
                    <p className="opacity-80">
                      Weave through obstacle cores. The neural speed grid accelerates permanently. Stay synced.
                    </p>
                  </div>

                  {highScore > 0 && (
                    <div className="mt-5 text-[#ffb703] font-orbitron text-xs tracking-widest animate-pulse">
                      BEST RECORDED DEVIATION: {highScore}M
                    </div>
                  )}

                  <button 
                    onClick={startGame}
                    className="mt-8 px-12 py-4 bg-white text-[#05050b] font-black rounded-full hover:scale-105 transition-all shadow-[0_0_30px_rgba(255,255,255,0.45)] cursor-pointer text-sm sm:text-base font-orbitron tracking-widest"
                    id="btn-engage-engine"
                  >
                    ENGAGE ENGINE
                  </button>
                </div>
              </div>
            )}

            {/* --- OVERLAY: GAME OVER SCREEN --- */}
            {gameState === 'gameover' && (
              <div className="absolute inset-0 bg-[#05050b]/85 backdrop-blur-xs flex flex-col items-center justify-center p-6 text-center z-10" id="gameover-screen-overlay">
                <div className="max-w-md animate-fade-in">
                  <h2 className="text-4xl sm:text-5xl font-black italic tracking-tighter text-[#ff2ec4] font-orbitron drop-shadow-[0_0_20px_rgba(255,46,196,0.95)]">
                    CRASH DETECTED
                  </h2>
                  <p className="mt-1 text-[#ffb703] tracking-[0.2em] uppercase text-xs font-bold font-orbitron">
                    NEURAL PROTOCOL DISCONNECTED
                  </p>

                  <div className="mt-6 p-6 rounded bg-[#07070f]/95 border border-[#ff2ec4]/30 relative">
                    <div className="text-[11px] text-[#00f0ff] uppercase tracking-widest font-mono">Distance Traveled</div>
                    <div className="text-4xl font-black text-white font-orbitron mt-1 drop-shadow-[0_0_10px_rgba(255,255,255,0.5)]">
                      {score} M
                    </div>
                    
                    {score >= highScore && score > 0 && (
                      <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-[#ffb703] to-[#ff2ec4] text-black text-[10px] font-black px-3 py-1 rounded-full font-orbitron tracking-widest border border-black animate-bounce shadow-[0_0_15px_rgba(255,183,3,0.5)]">
                        NEW BEST RECORD
                      </span>
                    )}

                    <div className="mt-4 pt-4 border-t border-white/5 flex justify-between text-xs text-white/50 font-mono">
                      <span>Callsign: <strong className="text-white">{username}</strong></span>
                      <span>Best Score: <strong className="text-[#ffb703]">{highScore}M</strong></span>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mt-8">
                    <button 
                      onClick={restartGame}
                      className="w-full sm:w-auto px-10 py-3.5 bg-gradient-to-r from-[#00f0ff] to-[#ff2ec4] text-black font-black rounded-full hover:scale-105 transition-all shadow-[0_0_25px_rgba(0,240,255,0.45)] cursor-pointer text-sm font-orbitron tracking-widest"
                      id="btn-re-engage"
                    >
                      RE-ENGAGE SYSTEM
                    </button>
                    <button 
                      onClick={() => setGameState('title')}
                      className="w-full sm:w-auto px-8 py-3.5 bg-white/10 border border-white/20 text-white font-semibold rounded-full hover:bg-white/20 transition-all cursor-pointer text-sm font-orbitron tracking-wider"
                    >
                      QUIT TO GRID
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* --- MOBILE TOUCH STEERING ARROWS ON SCREEN --- */}
            {gameState === 'playing' && (
              <div className="absolute inset-x-0 bottom-6 px-8 flex justify-between pointer-events-none z-10" id="on-screen-steering">
                <button 
                  className="pointer-events-auto w-14 h-14 rounded-full border border-[#00f0ff]/50 bg-[#07070f]/80 flex items-center justify-center text-[#00f0ff] hover:bg-[#00f0ff]/20 active:scale-95 transition-all shadow-[0_0_15px_rgba(0,240,255,0.25)] select-none cursor-pointer"
                  onClick={() => gameLoopRef.current?.changeLaneLeft()}
                  title="Shift Left"
                >
                  <ArrowLeft className="w-6 h-6 animate-pulse" />
                </button>
                <button 
                  className="pointer-events-auto w-14 h-14 rounded-full border border-[#00f0ff]/50 bg-[#07070f]/80 flex items-center justify-center text-[#00f0ff] hover:bg-[#00f0ff]/20 active:scale-95 transition-all shadow-[0_0_15px_rgba(0,240,255,0.25)] select-none cursor-pointer"
                  onClick={() => gameLoopRef.current?.changeLaneRight()}
                  title="Shift Right"
                >
                  <ArrowRight className="w-6 h-6 animate-pulse" />
                </button>
              </div>
            )}

            {/* Aesthetic spinning radar widget */}
            <div className="absolute bottom-6 left-6 w-16 h-16 border border-[#ff2ec4]/30 rounded-full hidden md:flex items-center justify-center pointer-events-none z-10">
              <div className="w-11 h-11 border-t-2 border-r-2 border-[#ff2ec4] rounded-full animate-spin"></div>
              <span className="absolute text-[8px] font-mono text-[#ff2ec4]">SYS_SCAN</span>
            </div>

          </div>
        </section>

        {/* RIGHT COLUMN: ACTIVE VEHICLE SPECIFICATIONS */}
        <aside className="w-full lg:w-80 border-t lg:border-t-0 lg:border-l border-[#00f0ff]/10 bg-[#07070f]/75 p-5 flex flex-col shrink-0 overflow-y-auto" id="garage-section">
          <div className="flex items-center gap-2 mb-4 border-b border-white/5 pb-2">
            <Cpu className="w-4 h-4 text-[#ff2ec4]" />
            <h3 className="text-xs font-bold text-[#ff2ec4] tracking-[0.2em] uppercase font-orbitron">Active Vehicle</h3>
          </div>

          {/* Vehicle Wireframe Representation Preview */}
          <div className="mb-6">
            <div className="aspect-video bg-[#12121f] border border-[#00f0ff]/20 rounded-lg flex flex-col items-center justify-center p-3 relative overflow-hidden group shadow-[inset_0_0_20px_rgba(0,240,255,0.05)]">
              {/* Outer decorative grids */}
              <div className="absolute inset-0 bg-[linear-gradient(rgba(18,18,31,0.4)_1px,transparent_1px),linear-gradient(90deg,rgba(18,18,31,0.4)_1px,transparent_1px)] bg-[size:10px_10px] opacity-45 pointer-events-none"></div>
              
              {/* Animated Glowing neon car wireframe block representation */}
              <div 
                className="w-24 h-8 rounded relative skew-x-12 border-b-4 transition-all duration-300 transform group-hover:scale-105"
                style={{ 
                  backgroundColor: `rgba(${(activeVehicle.color >> 16) & 255}, ${(activeVehicle.color >> 8) & 255}, ${activeVehicle.color & 255}, 0.25)`,
                  borderColor: `#${activeVehicle.underglow.toString(16).padStart(6, '0')}`,
                  boxShadow: `0 8px 20px -3px #${activeVehicle.underglow.toString(16).padStart(6, '0')}80`
                }}
              >
                {/* Windshield */}
                <div className="absolute top-1 right-2 w-7 h-2.5 bg-white/30 rounded skew-x-3"></div>
                {/* Glowing thruster tail */}
                <div 
                  className="absolute left-0 bottom-1 w-2 h-4 rounded-l-xs animate-ping"
                  style={{ backgroundColor: `#${activeVehicle.underglow.toString(16).padStart(6, '0')}` }}
                ></div>
              </div>

              <div className="absolute bottom-2 left-2 text-[8px] font-mono text-white/40 uppercase">
                INTEGRITY // ACTIVE_CORES
              </div>
            </div>

            {/* Vehicle Meta Headers */}
            <div className="flex justify-between items-end mt-4">
              <h4 className="text-lg font-black font-orbitron text-white tracking-wide">{activeVehicle.name}</h4>
              <span className="text-[9px] px-2 py-0.5 font-bold bg-[#00f0ff]/10 text-[#00f0ff] border border-[#00f0ff]/25 font-mono rounded">
                {activeVehicle.mark}
              </span>
            </div>
            
            <p className="text-xs text-white/60 mt-2 leading-relaxed font-rajdhani border-b border-white/5 pb-4 min-h-[50px]">
              {activeVehicle.description}
            </p>

            {/* Spec Sliders */}
            <div className="space-y-3 mt-4">
              <div>
                <div className="flex justify-between text-[10px] uppercase font-mono tracking-widest mb-1 text-white/70">
                  <span className="flex items-center gap-1"><Zap className="w-3 h-3 text-[#00f0ff]" /> Speed Factor</span>
                  <span className="text-[#00f0ff] font-bold">{activeVehicle.velocity}%</span>
                </div>
                <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-[#00f0ff] rounded-full transition-all duration-500" 
                    style={{ width: `${activeVehicle.velocity}%` }}
                  ></div>
                </div>
              </div>

              <div>
                <div className="flex justify-between text-[10px] uppercase font-mono tracking-widest mb-1 text-white/70">
                  <span className="flex items-center gap-1"><Compass className="w-3 h-3 text-[#ff2ec4]" /> Maneuver</span>
                  <span className="text-[#ff2ec4] font-bold">{activeVehicle.agility}%</span>
                </div>
                <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-[#ff2ec4] rounded-full transition-all duration-500" 
                    style={{ width: `${activeVehicle.agility}%` }}
                  ></div>
                </div>
              </div>

              <div>
                <div className="flex justify-between text-[10px] uppercase font-mono tracking-widest mb-1 text-white/70">
                  <span className="flex items-center gap-1"><Shield className="w-3 h-3 text-[#ffb703]" /> Shield Armour</span>
                  <span className="text-[#ffb703] font-bold">{activeVehicle.resilience}%</span>
                </div>
                <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-[#ffb703] rounded-full transition-all duration-500" 
                    style={{ width: `${activeVehicle.resilience}%` }}
                  ></div>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Vehicle Garage Selection List */}
          <div className="mt-auto border-t border-white/5 pt-4">
            <div className="flex justify-between items-center mb-2">
              <span className="text-[10px] text-white/50 tracking-widest uppercase font-mono">
                Select Fleet Ship:
              </span>
              <span className="text-[9px] text-green-400 font-mono">PROCEDURAL ENGINE ENGAGED</span>
            </div>
            <div className="grid grid-cols-2 xl:grid-cols-4 gap-2">
              {VEHICLES.map((vehicle) => {
                const isActive = selectedVehicleId === vehicle.id;
                return (
                  <button
                    key={vehicle.id}
                    onClick={() => handleSelectVehicle(vehicle.id)}
                    className={`p-2.5 rounded border text-center transition-all cursor-pointer flex flex-col items-center justify-center ${
                      isActive 
                        ? 'bg-white/10 border-[#00f0ff] text-[#00f0ff] shadow-[0_0_10px_rgba(0,240,255,0.25)]' 
                        : 'bg-[#12121f]/50 border-white/10 text-white/60 hover:text-white hover:bg-[#12121f] hover:border-white/20'
                    }`}
                    id={`garage-btn-${vehicle.id}`}
                  >
                    <span className="text-[10px] font-black font-orbitron">{vehicle.name.split('-')[1] || vehicle.name}</span>
                    <span className="text-[8px] opacity-45 font-mono">{vehicle.mark.split(' ')[1] || vehicle.mark}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </aside>
      </main>

      {/* ---------- BOTTOM STATUS BAR ---------- */}
      <footer className="h-10 bg-black border-t border-[#00f0ff]/10 px-8 flex items-center justify-between shrink-0 text-[10px] font-mono z-20" id="footer">
        <div className="flex gap-6 items-center text-white/40 uppercase">
          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-ping"></span> 
            Tokyo Gate Sync: <strong className="text-green-400">{ping}ms</strong>
          </span>
          <span className="hidden sm:inline">Build: v4.26.0-Sleek</span>
          {gameState === 'playing' && (
            <span className="hidden md:inline text-[#00f0ff]/80 animate-pulse">
              SYS STATUS: ACTIVE_ACCELERATION_GRID
            </span>
          )}
        </div>

        <div className="flex gap-4 items-center">
          <div className="flex gap-1.5">
            <div className="w-2 h-2 bg-[#00f0ff] rounded-full shadow-[0_0_6px_#00f0ff]"></div>
            <div className="w-2 h-2 bg-[#ff2ec4] rounded-full shadow-[0_0_6px_#ff2ec4]"></div>
            <div className="w-2 h-2 bg-[#ffb703] rounded-full shadow-[0_0_6px_#ffb703]"></div>
          </div>
          <span className="text-white/30 text-[9px]">SECURE CONNECTION TLS_1.3</span>
        </div>
      </footer>
    </div>
  );
}
