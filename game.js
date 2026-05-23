import * as THREE from 'three';

class Game {
  constructor() {
    // Scene with sky blue background
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x7EC8E3);

    // Camera - PerspectiveCamera, 60 FOV, position (0, 5, 8)
    this.camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    this.camera.position.set(0, 5, 8);

    // Renderer - WebGLRenderer with antialias
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(window.devicePixelRatio);
    document.body.appendChild(this.renderer.domElement);

    // Window resize handling
    window.addEventListener('resize', () => {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
    });

    // Character configuration - 5 playable characters
    this.characters = {
      rabbit: { name: '小兔子', color: 0xFFB6C1, bodyHeight: 0.6, earLength: 0.3 },
      cat: { name: '小猫咪', color: 0xFFA500, bodyHeight: 0.5 },
      bear: { name: '小熊', color: 0x8B4513, bodyHeight: 0.6 },
      boy: { name: '小男孩', color: 0x4169E1, bodyHeight: 0.7 },
      girl: { name: '小女孩', color: 0xFF69B4, bodyHeight: 0.65 }
    };
    this.currentCharacter = 'rabbit';

    // Block configuration
    this.blockConfig = {
      width: 1.2,
      height: 0.5,
      depth: 1.2
    };

    this.blockMaterials = {
      normal: new THREE.MeshLambertMaterial({ color: 0xFFE5A0 }),
      start: new THREE.MeshLambertMaterial({ color: 0x98D9A4 }),
      end: new THREE.MeshLambertMaterial({ color: 0xFFD700 })
    };

    this.rewardGeometries = {
      coin: new THREE.CylinderGeometry(0.15, 0.15, 0.05, 16),
      energy: new THREE.OctahedronGeometry(0.15),
      heart: new THREE.SphereGeometry(0.12, 16, 16)
    };

    this.rewardMaterials = {
      coin: new THREE.MeshLambertMaterial({ color: 0xFFD700 }),
      energy: new THREE.MeshLambertMaterial({ color: 0xB39DDB }),
      heart: new THREE.MeshLambertMaterial({ color: 0xFF6B8A })
    };

    this.blocks = [];

    // Game state and jump configuration
    this.gameState = 'waiting';
    this.jumpDuration = 400;
    this.lives = 3;
    this.score = 0;
    this.energyCount = 0;
    this.hasShield = false;
    this.currentLevel = 1;

    // Level system - 20 levels with progressive difficulty
    this.levels = [
      { id: 1, name: "起步", blocks: [{x: 0, z: 0, type: 'start', reward: null}, {x: 1, z: 0, type: 'normal', reward: 'coin'}, {x: 2, z: 0, type: 'normal', reward: 'coin'}, {x: 3, z: 0, type: 'normal', reward: 'energy'}, {x: 4, z: 0, type: 'end', reward: null}] },
      { id: 2, name: "转向", blocks: [{x: 0, z: 0, type: 'start', reward: null}, {x: 1, z: 0, type: 'normal', reward: 'coin'}, {x: 2, z: 0, type: 'normal', reward: 'coin'}, {x: 2, z: 1, type: 'normal', reward: 'heart'}, {x: 2, z: 2, type: 'normal', reward: 'coin'}, {x: 3, z: 2, type: 'end', reward: null}] },
      { id: 3, name: "曲折", blocks: [{x: 0, z: 0, type: 'start', reward: null}, {x: 1, z: 0, type: 'normal', reward: 'coin'}, {x: 2, z: 0, type: 'normal', reward: 'coin'}, {x: 3, z: 0, type: 'normal', reward: 'energy'}, {x: 3, z: 1, type: 'normal', reward: 'heart'}, {x: 3, z: 2, type: 'normal', reward: 'coin'}, {x: 2, z: 2, type: 'normal', reward: 'coin'}, {x: 1, z: 2, type: 'end', reward: null}] },
      { id: 4, name: "三角", blocks: [{x: 0, z: 0, type: 'start', reward: null}, {x: 1, z: 0, type: 'normal', reward: 'coin'}, {x: 2, z: 0, type: 'normal', reward: 'heart'}, {x: 2, z: 1, type: 'normal', reward: 'coin'}, {x: 2, z: 2, type: 'normal', reward: 'energy'}, {x: 1, z: 2, type: 'normal', reward: 'coin'}, {x: 0, z: 2, type: 'end', reward: null}] },
      { id: 5, name: "方块", blocks: [{x: 0, z: 0, type: 'start', reward: null}, {x: 1, z: 0, type: 'normal', reward: 'coin'}, {x: 2, z: 0, type: 'normal', reward: 'energy'}, {x: 2, z: 1, type: 'normal', reward: 'heart'}, {x: 2, z: 2, type: 'normal', reward: 'coin'}, {x: 1, z: 2, type: 'normal', reward: 'coin'}, {x: 0, z: 2, type: 'normal', reward: 'coin'}, {x: 0, z: 1, type: 'end', reward: null}] },
      { id: 6, name: "长路", blocks: [{x: 0, z: 0, type: 'start', reward: null}, {x: 1, z: 0, type: 'normal', reward: 'coin'}, {x: 2, z: 0, type: 'normal', reward: 'coin'}, {x: 3, z: 0, type: 'normal', reward: 'energy'}, {x: 4, z: 0, type: 'normal', reward: 'coin'}, {x: 5, z: 0, type: 'normal', reward: 'heart'}, {x: 6, z: 0, type: 'normal', reward: 'coin'}, {x: 7, z: 0, type: 'end', reward: null}] },
      { id: 7, name: "折返", blocks: [{x: 0, z: 0, type: 'start', reward: null}, {x: 1, z: 0, type: 'normal', reward: 'coin'}, {x: 2, z: 0, type: 'normal', reward: 'coin'}, {x: 3, z: 0, type: 'normal', reward: 'energy'}, {x: 4, z: 0, type: 'normal', reward: 'coin'}, {x: 4, z: -1, type: 'normal', reward: 'heart'}, {x: 4, z: -2, type: 'normal', reward: 'coin'}, {x: 3, z: -2, type: 'normal', reward: 'coin'}, {x: 2, z: -2, type: 'end', reward: null}] },
      { id: 8, name: "螺旋", blocks: [{x: 0, z: 0, type: 'start', reward: null}, {x: 1, z: 0, type: 'normal', reward: 'coin'}, {x: 2, z: 0, type: 'normal', reward: 'coin'}, {x: 2, z: 1, type: 'normal', reward: 'energy'}, {x: 2, z: 2, type: 'normal', reward: 'coin'}, {x: 1, z: 2, type: 'normal', reward: 'heart'}, {x: 0, z: 2, type: 'normal', reward: 'coin'}, {x: -1, z: 2, type: 'normal', reward: 'coin'}, {x: -1, z: 1, type: 'end', reward: null}] },
      { id: 9, name: "迷宫", blocks: [{x: 0, z: 0, type: 'start', reward: null}, {x: 1, z: 0, type: 'normal', reward: 'coin'}, {x: 2, z: 0, type: 'normal', reward: 'energy'}, {x: 2, z: 1, type: 'normal', reward: 'heart'}, {x: 2, z: 2, type: 'normal', reward: 'coin'}, {x: 1, z: 2, type: 'normal', reward: 'coin'}, {x: 0, z: 2, type: 'normal', reward: 'coin'}, {x: -1, z: 2, type: 'normal', reward: 'coin'}, {x: -1, z: 1, type: 'normal', reward: 'coin'}, {x: -1, z: 0, type: 'end', reward: null}] },
      { id: 10, name: "双线", blocks: [{x: 0, z: 0, type: 'start', reward: null}, {x: 1, z: 0, type: 'normal', reward: 'coin'}, {x: 2, z: 0, type: 'normal', reward: 'coin'}, {x: 3, z: 0, type: 'normal', reward: 'energy'}, {x: 4, z: 0, type: 'normal', reward: 'coin'}, {x: 4, z: 1, type: 'normal', reward: 'heart'}, {x: 4, z: 2, type: 'normal', reward: 'coin'}, {x: 5, z: 2, type: 'end', reward: null}] },
      { id: 11, name: "回形", blocks: [{x: 0, z: 0, type: 'start', reward: null}, {x: 1, z: 0, type: 'normal', reward: 'coin'}, {x: 2, z: 0, type: 'normal', reward: 'coin'}, {x: 3, z: 0, type: 'normal', reward: 'energy'}, {x: 4, z: 0, type: 'normal', reward: 'coin'}, {x: 5, z: 0, type: 'normal', reward: 'heart'}, {x: 5, z: 1, type: 'normal', reward: 'coin'}, {x: 5, z: 2, type: 'normal', reward: 'coin'}, {x: 5, z: 3, type: 'normal', reward: 'coin'}, {x: 4, z: 3, type: 'normal', reward: 'coin'}, {x: 3, z: 3, type: 'end', reward: null}] },
      { id: 12, name: "跳跃", blocks: [{x: 0, z: 0, type: 'start', reward: null}, {x: 2, z: 0, type: 'normal', reward: 'coin'}, {x: 4, z: 0, type: 'normal', reward: 'energy'}, {x: 6, z: 0, type: 'normal', reward: 'heart'}, {x: 8, z: 0, type: 'end', reward: null}] },
      { id: 13, name: "S形", blocks: [{x: 0, z: 0, type: 'start', reward: null}, {x: 1, z: 0, type: 'normal', reward: 'coin'}, {x: 2, z: 0, type: 'normal', reward: 'coin'}, {x: 3, z: 0, type: 'normal', reward: 'energy'}, {x: 4, z: 0, type: 'normal', reward: 'coin'}, {x: 4, z: 1, type: 'normal', reward: 'heart'}, {x: 4, z: 2, type: 'normal', reward: 'coin'}, {x: 3, z: 2, type: 'normal', reward: 'coin'}, {x: 2, z: 2, type: 'normal', reward: 'coin'}, {x: 1, z: 2, type: 'end', reward: null}] },
      { id: 14, name: "楼梯", blocks: [{x: 0, z: 0, type: 'start', reward: null}, {x: 0, z: 1, type: 'normal', reward: 'coin'}, {x: 0, z: 2, type: 'normal', reward: 'coin'}, {x: 1, z: 2, type: 'normal', reward: 'energy'}, {x: 1, z: 3, type: 'normal', reward: 'heart'}, {x: 2, z: 3, type: 'normal', reward: 'coin'}, {x: 2, z: 4, type: 'normal', reward: 'coin'}, {x: 3, z: 4, type: 'end', reward: null}] },
      { id: 15, name: "菱形", blocks: [{x: 0, z: 0, type: 'start', reward: null}, {x: 1, z: 0, type: 'normal', reward: 'coin'}, {x: 2, z: 0, type: 'normal', reward: 'energy'}, {x: 3, z: 0, type: 'normal', reward: 'coin'}, {x: 2, z: 1, type: 'normal', reward: 'heart'}, {x: 1, z: 1, type: 'normal', reward: 'coin'}, {x: 0, z: 1, type: 'end', reward: null}] },
      { id: 16, name: "Z形", blocks: [{x: 0, z: 0, type: 'start', reward: null}, {x: 1, z: 0, type: 'normal', reward: 'coin'}, {x: 2, z: 0, type: 'normal', reward: 'coin'}, {x: 3, z: 0, type: 'normal', reward: 'energy'}, {x: 3, z: 1, type: 'normal', reward: 'heart'}, {x: 2, z: 1, type: 'normal', reward: 'coin'}, {x: 1, z: 1, type: 'normal', reward: 'coin'}, {x: 0, z: 1, type: 'end', reward: null}] },
      { id: 17, name: "叉形", blocks: [{x: 0, z: 0, type: 'start', reward: null}, {x: 1, z: 0, type: 'normal', reward: 'coin'}, {x: 2, z: 0, type: 'normal', reward: 'energy'}, {x: 2, z: 1, type: 'normal', reward: 'heart'}, {x: 2, z: 2, type: 'normal', reward: 'coin'}, {x: 1, z: 2, type: 'normal', reward: 'coin'}, {x: 0, z: 2, type: 'normal', reward: 'coin'}, {x: 0, z: 1, type: 'end', reward: null}] },
      { id: 18, name: "圈套", blocks: [{x: 0, z: 0, type: 'start', reward: null}, {x: 1, z: 0, type: 'normal', reward: 'coin'}, {x: 2, z: 0, type: 'normal', reward: 'coin'}, {x: 3, z: 0, type: 'normal', reward: 'energy'}, {x: 3, z: 1, type: 'normal', reward: 'heart'}, {x: 3, z: 2, type: 'normal', reward: 'coin'}, {x: 2, z: 2, type: 'normal', reward: 'coin'}, {x: 1, z: 2, type: 'normal', reward: 'coin'}, {x: 0, z: 2, type: 'normal', reward: 'coin'}, {x: 0, z: 1, type: 'end', reward: null}] },
      { id: 19, name: "长蛇", blocks: [{x: 0, z: 0, type: 'start', reward: null}, {x: 1, z: 0, type: 'normal', reward: 'coin'}, {x: 2, z: 0, type: 'normal', reward: 'coin'}, {x: 3, z: 0, type: 'normal', reward: 'energy'}, {x: 4, z: 0, type: 'normal', reward: 'coin'}, {x: 5, z: 0, type: 'normal', reward: 'heart'}, {x: 6, z: 0, type: 'normal', reward: 'coin'}, {x: 7, z: 0, type: 'normal', reward: 'coin'}, {x: 8, z: 0, type: 'end', reward: null}] },
      { id: 20, name: "终极", blocks: [{x: 0, z: 0, type: 'start', reward: null}, {x: 1, z: 0, type: 'normal', reward: 'coin'}, {x: 2, z: 0, type: 'normal', reward: 'coin'}, {x: 3, z: 0, type: 'normal', reward: 'energy'}, {x: 4, z: 0, type: 'normal', reward: 'coin'}, {x: 4, z: 1, type: 'normal', reward: 'heart'}, {x: 4, z: 2, type: 'normal', reward: 'coin'}, {x: 3, z: 2, type: 'normal', reward: 'coin'}, {x: 2, z: 2, type: 'normal', reward: 'energy'}, {x: 1, z: 2, type: 'normal', reward: 'coin'}, {x: 0, z: 2, type: 'normal', reward: 'coin'}, {x: -1, z: 2, type: 'normal', reward: 'heart'}, {x: -1, z: 1, type: 'end', reward: null}] }
    ];

    this.directionMap = {
      'ArrowUp': { x: 0, z: -1 },
      'ArrowDown': { x: 0, z: 1 },
      'ArrowLeft': { x: -1, z: 0 },
      'ArrowRight': { x: 1, z: 0 }
    };

    // Create player character
    this.player = this.createCharacter(this.currentCharacter);
    this.player.position.set(0, 0.5, 0);
    this.scene.add(this.player);

    // Initialize input handling
    this.initInput();

    // Simple animate loop
    this.animate();
  }

  addEyes(group, y) {
    const eyeGeo = new THREE.SphereGeometry(0.04, 8, 8);
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0x000000 });
    const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
    leftEye.position.set(-0.08, y, 0.18);
    group.add(leftEye);
    const rightEye = new THREE.Mesh(eyeGeo, eyeMat);
    rightEye.position.set(0.08, y, 0.18);
    group.add(rightEye);
  }

  createCharacter(type) {
    const config = this.characters[type];
    if (!config) return undefined;

    const group = new THREE.Group();

    // Body - CapsuleGeometry
    const bodyGeo = new THREE.CapsuleGeometry(0.25, config.bodyHeight - 0.5, 4, 8);
    const bodyMat = new THREE.MeshBasicMaterial({ color: config.color });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.y = config.bodyHeight / 2;
    group.add(body);

    // Head - SphereGeometry
    const headGeo = new THREE.SphereGeometry(0.2, 16, 16);
    const headMat = new THREE.MeshBasicMaterial({ color: config.color });
    const head = new THREE.Mesh(headGeo, headMat);
    head.position.y = config.bodyHeight + 0.1;
    group.add(head);

    // Character-specific features
    if (type === 'rabbit') {
      // Long ears
      const earGeo = new THREE.CapsuleGeometry(0.05, config.earLength, 4, 8);
      const earMat = new THREE.MeshBasicMaterial({ color: config.color });
      const leftEar = new THREE.Mesh(earGeo, earMat);
      leftEar.position.set(-0.1, config.bodyHeight + 0.35, 0);
      leftEar.rotation.z = -0.2;
      group.add(leftEar);

      const rightEar = new THREE.Mesh(earGeo, earMat);
      rightEar.position.set(0.1, config.bodyHeight + 0.35, 0);
      rightEar.rotation.z = 0.2;
      group.add(rightEar);
    } else if (type === 'cat') {
      // Triangular ears
      const earGeo = new THREE.ConeGeometry(0.1, 0.2, 4);
      const earMat = new THREE.MeshBasicMaterial({ color: config.color });
      const leftEar = new THREE.Mesh(earGeo, earMat);
      leftEar.position.set(-0.12, config.bodyHeight + 0.2, 0);
      group.add(leftEar);

      const rightEar = new THREE.Mesh(earGeo, earMat);
      rightEar.position.set(0.12, config.bodyHeight + 0.2, 0);
      group.add(rightEar);
    } else if (type === 'bear') {
      // Round ears
      const earGeo = new THREE.SphereGeometry(0.08, 8, 8);
      const earMat = new THREE.MeshBasicMaterial({ color: config.color });
      const leftEar = new THREE.Mesh(earGeo, earMat);
      leftEar.position.set(-0.18, config.bodyHeight + 0.2, 0);
      group.add(leftEar);

      const rightEar = new THREE.Mesh(earGeo, earMat);
      rightEar.position.set(0.18, config.bodyHeight + 0.2, 0);
      group.add(rightEar);
    } else if (type === 'boy') {
      // Eyes
      this.addEyes(group, config.bodyHeight + 0.15);
    } else if (type === 'girl') {
      // Eyes
      this.addEyes(group, config.bodyHeight + 0.15);

      // Hair clip
      const clipGeo = new THREE.SphereGeometry(0.06, 8, 8);
      const clipMat = new THREE.MeshBasicMaterial({ color: 0xFFD700 });
      const clip = new THREE.Mesh(clipGeo, clipMat);
      clip.position.set(0.15, config.bodyHeight + 0.22, 0.1);
      group.add(clip);
    }

    return group;
  }

  createBlock(x, z, type, reward) {
    const group = new THREE.Group();
    group.userData = { type, reward, x, z };

    const geometry = new THREE.BoxGeometry(
      this.blockConfig.width,
      this.blockConfig.height,
      this.blockConfig.depth
    );
    const material = this.blockMaterials[type] || this.blockMaterials.normal;
    const mesh = new THREE.Mesh(geometry, material);
    group.add(mesh);

    if (type === 'start' || type === 'end') {
      const edges = new THREE.EdgesGeometry(geometry);
      const line = new THREE.LineSegments(
        edges,
        new THREE.LineBasicMaterial({ color: 0x000000 })
      );
      group.add(line);
    }

    if (reward && this.rewardGeometries[reward]) {
      const rewardGeo = this.rewardGeometries[reward];
      const rewardMat = this.rewardMaterials[reward];
      const rewardMesh = new THREE.Mesh(rewardGeo, rewardMat);
      rewardMesh.position.y = this.blockConfig.height / 2 + 0.2;
      group.add(rewardMesh);
    }

    group.position.set(x * this.blockConfig.width, 0, z * this.blockConfig.depth);
    return group;
  }

  switchCharacter(type) {
    if (!this.characters[type]) return;

    // Remove current player and dispose resources
    if (this.player) {
      this.player.traverse((obj) => {
        if (obj.geometry) obj.geometry.dispose();
        if (obj.material) obj.material.dispose();
      });
      this.scene.remove(this.player);
    }

    // Update current character
    this.currentCharacter = type;

    // Create and add new character
    this.player = this.createCharacter(type);
    this.player.position.set(0, 0.5, 0);
    this.scene.add(this.player);
  }

  animate() {
    requestAnimationFrame(() => this.animate());
    this.renderer.render(this.scene, this.camera);
  }

  initInput() {
    window.addEventListener('keydown', (e) => this.onKeyDown(e));
  }

  onKeyDown(e) {
    if (this.gameState !== 'waiting') return;
    const direction = this.directionMap[e.key];
    if (direction) {
      e.preventDefault();
      this.startJump(direction);
    }
  }

  startJump(direction) {
    this.gameState = 'jumping';
    const startPos = this.player.position.clone();
    const targetX = startPos.x + direction.x * this.blockConfig.width;
    const targetZ = startPos.z + direction.z * this.blockConfig.depth;

    const startTime = performance.now();
    const jumpHeight = 0.8;

    const animateJump = (currentTime) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / this.jumpDuration, 1);
      const arc = Math.sin(progress * Math.PI);
      const currentX = startPos.x + (targetX - startPos.x) * progress;
      const currentZ = startPos.z + (targetZ - startPos.z) * progress;
      const currentY = startPos.y + arc * jumpHeight;
      this.player.position.set(currentX, currentY, currentZ);

      if (progress < 1) {
        requestAnimationFrame(animateJump);
      } else {
        this.onJumpComplete(targetX, targetZ);
      }
    };

    requestAnimationFrame(animateJump);
  }

  onJumpComplete(x, z) {
    const block = this.checkBlockAt(x, z);
    if (block) {
      this.gameState = 'waiting';
    } else {
      this.onDeath();
    }
  }

  checkBlockAt(x, z) {
    const threshold = 0.6;
    for (const block of this.blocks) {
      const dx = Math.abs(block.position.x - x);
      const dz = Math.abs(block.position.z - z);
      if (dx < threshold && dz < threshold) {
        return block;
      }
    }
    return null;
  }

  onDeath() {
    this.lives = (this.lives || 3) - 1;
    this.gameState = 'dead';
    if (this.lives > 0) {
      this.resetPlayerPosition();
    }
  }

  resetPlayerPosition() {
    this.player.position.set(0, 0.5, 0);
    this.gameState = 'waiting';
  }

  loadLevel(levelId) {
    const level = this.levels.find(l => l.id === levelId);
    if (!level) return;

    this.currentLevel = levelId;

    // Clear old blocks
    this.blocks.forEach(block => this.scene.remove(block));
    this.blocks = [];

    // Load new level blocks
    level.blocks.forEach(data => {
      const block = this.createBlock(data.x, data.z, data.type, data.reward);
      this.scene.add(block);
      this.blocks.push(block);
    });

    // Reset player position to start
    const startBlock = level.blocks.find(b => b.type === 'start');
    if (startBlock) {
      this.player.position.set(
        startBlock.x * this.blockConfig.width,
        this.blockConfig.height / 2 + 0.5,
        startBlock.z * this.blockConfig.depth
      );
    }

    this.lives = 3;
    this.score = 0;
    this.energyCount = 0;
    this.hasShield = false;
    this.gameState = 'waiting';
  }

  nextLevel() {
    if (this.currentLevel < this.levels.length) {
      this.loadLevel(this.currentLevel + 1);
    }
  }
}

// Initialize game
window.game = new Game();