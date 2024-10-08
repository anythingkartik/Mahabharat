const PI = Math.PI,
  TAU = PI * 2,
  ABS = Math.abs,
  RAND = Math.random,
  ROUND = Math.round,
  SIN = Math.sin,
  COS = Math.cos,
  lib = {
    v2: Vector2,
    noise: noise,
  };

class Config {
  constructor(opts) {
    this.merge(opts);
  }
  merge(opts) {
    for (let opt in opts) this.set(opt, opts[opt]);
  }
  set(key, value) {
    if (!key || !value) return;
    else this[key] = value;
  }
}

class Canvas {
  constructor(selector, context) {
    if (selector) {
      this.el = document.querySelector(selector);
    } else {
      this.el = document.createElement('canvas');
      document.body.appendChild(this.el);
    }
    this.ctx = this.el.getContext(context) || this.el.getContext('2d');
    this.dimensions = new lib.v2();
    this.resize();
    window.addEventListener('resize', this.resize.bind(this));
  }
  hsla(h, s, l, a) {
    return `hsla(${h},${s},${l},${a})`;
  }

  fill(x, y, width, height, fill) {
    this.ctx.fillStyle = fill || 'rgba(0,0,0,1)';
    this.ctx.fillRect(x, y, width, height);
  }
  drawLine(x1, y1, x2, y2, stroke, strokeWidth) {
    this.ctx.beginPath();
    this.ctx.moveTo(x1, y1);
    this.ctx.lineTo(x2, y2);
    this.ctx.strokeStyle = stroke || 'rgba(255,255,255,1)';
    this.ctx.lineWidth = strokeWidth || '2';
    this.ctx.stroke();
    this.ctx.closePath();
  }
  drawArc(x, y, r, fill, stroke, strokeWidth) {
    this.ctx.beginPath();
    this.ctx.arc(x, y, r, 0, TAU);
    this.ctx.fillStyle = fill || 'rgba(200,0,0,1)';
    this.ctx.fill();
    if (stroke) {
      this.ctx.strokeStyle = stroke;
      this.ctx.lineWidth = strokeWidth || '2';
      this.ctx.stroke();
    }
    this.ctx.closePath();
  }
  resize() {
    this.el.width = this.dimensions.x = window.innerWidth;
    this.el.height = this.dimensions.y = window.innerHeight;
    this.center = { x: this.dimensions.x * 0.5, y: this.dimensions.y * 0.5 };
  }

  drawImg() {
    var base_image = new Image();
    base_image.src =
      'https://img.freepik.com/free-photo/rusted-metal-texture_1084-96.jpg';
    base_image.onload = function () {
      this.ctx.drawImage(base_image, 0, 0);
    };
  }

  drawText(text, x, y, fontSize, color) {
    this.ctx.font = `${fontSize}px 'Georgia', serif`; // Set the font size and font
    this.ctx.fillStyle = color; // Set the color
    this.ctx.textAlign = 'center'; // Align the text to the center
    this.ctx.textBaseline = 'middle'; // Align the text vertically to the middle
    this.ctx.fillText(text, x, y); // Draw the text at the specified x and y

    // this.ctx.shadowColor = 'rgba(255, 255, 0, 0.8)'; // Glow color (yellowish)
    // this.ctx.shadowBlur = 20; // Blur amount for the glow
    // this.ctx.shadowOffsetX = 0;
    // this.ctx.shadowOffsetY = 0;
    
    // this.ctx.fillText(text, x, y); // Draw the text at the specified x and y
  }
}

class Particle {
  constructor(x, y) {
    this.lastPosition = { x: 0, y: 0 };
    this.position = new lib.v2(x, y);
    this.velocity = new lib.v2();
  }
}

class Attractor {
  constructor(x, y) {
    this.size = 0;
    this.threshold = 0;
    this.position = new lib.v2(x, y);
  }
}

class Mouse {
  constructor() {
    let evts = [
      'mouseenter',
      'mousemove',
      'mouseout',
      'mousedown',
      'mouseup',
      'dblclick',
    ];

    this.hover = false;
    this.mousedown = false;
    this.dblClick = false;
    this.position = new lib.v2();
    for (let evt of evts) {
      window.addEventListener(evt, this.handler.bind(this));
    }
  }
  handler(e) {
    switch (e.type) {
      case 'mousedown':
        this.mousedown = true;
        break;
      case 'mouseup':
        this.mousedown = false;
        break;
      case 'mouseenter':
        this.hover = true;
        break;
      case 'mousemove':
        this.hover = true;
        break;
      case 'mouseout':
        this.hover = false;
        break;
      case 'dblclick':
        this.dblclick = true;
        break;
      default:
        break;
    }

    if (this.hover) {
      this.position.x = e.clientX;
      this.position.y = e.clientY;
    }
  }
}

class ParticleSystem {
  constructor() {
    this.tick = 0;
    this.particles = [];
    this.attractors = [];
    this.mouse = new Mouse();
    this.canvas = new Canvas('.canvas', '2d');
    this.bounds = this.canvas.dimensions;
    this.countDisplay = document.querySelector('.count');
    this.config = new Config({
      fill: 'rgba(0,0,0,0.6)',
      size: 4,
      speed: {
        x: 2,
        y: 2,
      },

      maxCount: 600,
      mouseThreshold: 40,
      mousePower: 10,
    });

    this.render();
  }
  render() {
    this.update();
    if (this.tick % 10 === 0)
      this.countDisplay.innerHTML = `${this.particles.length} Particles`;
    window.requestAnimationFrame(this.render.bind(this));
  }

  drawParticles() {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      let p = this.particles[i];
      this.checkBounds(p);
      if (p.remove === true || this.particles.length > this.config.maxCount) {
        this.particles.splice(i, 1);
      } else {
        let noiseVal, noiseNorm, theta, vel, hue, colorString;
        p.lastPosition.x = p.position.x;
        p.lastPosition.y = p.position.y;
        noiseVal = lib.noise.simplex3(
          p.position.x * 0.1025 * (this.mouse.position.x / this.bounds.x + 0.1),
          p.position.y * 0.1025 * (this.mouse.position.y / this.bounds.y + 0.1),
          this.tick * 0.0015
        );

        noiseNorm = ABS(noiseVal);
        theta = noiseVal * TAU;
        vel = new lib.v2(
          COS(theta) * this.config.speed.x,
          SIN(theta) * this.config.speed.y
        );

        hue = 40 * noiseNorm + 0;
        colorString = this.canvas.hsla(hue, '100%', '60%', 1);
        p.velocity.lerp(vel, 0.0125);
        p.position.add(p.velocity);
        if (
          this.mouse.hover &&
          this.mouse.position.distanceTo(p.position) <
            this.config.mouseThreshold
        ) {
          if (this.mouse.mousedown && this.config.mousePower > 0) {
            this.config.mousePower *= -1;
          } else if (!this.mouse.mousedown && this.config.mousePower < 0) {
            this.config.mousePower = ABS(this.config.mousePower);
          }
          if (this.mouse.position.distanceTo(p.position) < 1) {
            this.particles.splice(i, 1);
          } else {
            let mTheta = this.mouse.position.angleTo(p.position),
              mVel = new lib.v2(
                COS(mTheta) * this.config.mousePower,
                SIN(mTheta) * this.config.mousePower
              );

            p.velocity.lerp(mVel, 0.0125);
          }
        }
        for (let j = this.attractors.length - 1; j >= 0; j--) {
          let a = this.attractors[j],
            pDist = p.position.distanceTo(a.position);
          if (pDist < a.threshold) {
            if (pDist < 2) {
              this.particles.splice(i, 1);
              continue;
            } else {
              let aTheta = p.position.angleTo(a.position),
                aVel = new lib.v2(
                  COS(aTheta) * this.config.attractorPower,
                  SIN(aTheta) * this.config.attractorPower
                );

              p.velocity.lerp(aVel, 0.0075);
            }
          }
        }
        this.canvas.ctx.save();
        this.canvas.ctx.globalCompositeOperation = 'lighter';
        this.canvas.drawImg();
        this.canvas.drawLine(
          p.position.x,
          p.position.y,
          p.lastPosition.x,
          p.lastPosition.y,
          colorString,
          this.config.size
        );

        this.canvas.ctx.restore();
      }
    }
  }
  addParticles() {
    for (let i = 2; i > 0; i--) {
      let p = new Particle(
        RAND() * this.canvas.dimensions.x,
        RAND() * this.canvas.dimensions.y
      );

      this.particles.push(p);
    }
  }
  update() {
    this.canvas.fill(
      0,
      0,
      this.canvas.dimensions.x,
      this.canvas.dimensions.y,
      this.config.fill
    );

    this.addParticles();
    this.drawParticles();
    this.tick++;

    this.canvas.drawText(
      'Mahabharata',
      this.canvas.center.x,
      this.canvas.center.y,
      58,
      'white'
    );
  }
  checkBounds(p) {
    p.remove =
      p.position.x > this.bounds.x ||
      p.position.x < -this.config.size ||
      p.position.y > this.bounds.y ||
      p.position.y < -this.config.size;
  }
}

window.onload = () => {
  lib.noise.seed(RAND() * 2000);
  let flow = new ParticleSystem();
};

window.requestAnimationFrame = (() => {
  return (
    window.requestAnimationFrame ||
    window.webkitRequestAnimationFrame ||
    window.mozRequestAnimationFrame ||
    window.oRequestAnimationFrame ||
    window.msRequestAnimationFrame ||
    function (callback) {
      window.setTimeout(callback, 1000 / 60);
    }
  );
})();
