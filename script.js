(() => {
  const canvas = document.getElementById("particle-canvas");
  const floatingCta = document.querySelector(".floating-cta");
  const applySection = document.getElementById("apply");
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const sectionHeadings = Array.from(document.querySelectorAll(".section h2"));

  if (sectionHeadings.length) {
    const highlightedHeadings = sectionHeadings.map((heading) => {
      const label = heading.textContent.trim().replace(/\s+/g, " ");
      heading.setAttribute("aria-label", label);
      heading.classList.add("is-scroll-highlighted");
      return { heading, label, lines: [] };
    });

    const buildLines = ({ heading, label }) => {
      const words = label.split(" ").filter(Boolean);

      heading.replaceChildren(
        ...words.flatMap((word, index) => {
          const wordNode = document.createElement("span");
          wordNode.className = "section-heading-word";
          wordNode.setAttribute("aria-hidden", "true");
          wordNode.textContent = word;
          return index < words.length - 1 ? [wordNode, document.createTextNode(" ")] : [wordNode];
        }),
      );

      const wordNodes = Array.from(heading.querySelectorAll(".section-heading-word"));
      const lineGroups = [];
      let currentLine = [];
      let lastTop = null;

      wordNodes.forEach((word) => {
        const top = word.offsetTop;
        if (lastTop !== null && top > lastTop + 1) {
          lineGroups.push(currentLine);
          currentLine = [];
        }
        currentLine.push(word);
        lastTop = top;
      });

      if (currentLine.length) lineGroups.push(currentLine);

      const fragment = document.createDocumentFragment();
      lineGroups.forEach((lineWords) => {
        const lineNode = document.createElement("span");
        lineNode.className = "section-heading-line";
        lineNode.setAttribute("aria-hidden", "true");
        lineWords.forEach((word, wordIndex) => {
          lineNode.appendChild(word);
          if (wordIndex < lineWords.length - 1) {
            lineNode.appendChild(document.createTextNode(" "));
          }
        });
        fragment.appendChild(lineNode);
      });

      heading.replaceChildren(fragment);
      return Array.from(heading.querySelectorAll(".section-heading-line"));
    };

    const rebuildLines = () => {
      highlightedHeadings.forEach((entry) => {
        entry.lines = buildLines(entry);
      });
    };

    let headingFrame = 0;

    const updateHeadingHighlights = () => {
      headingFrame = 0;
      const viewportHeight = window.innerHeight || document.documentElement.clientHeight;
      const start = viewportHeight * 0.78;
      const end = viewportHeight * 0.26;

      highlightedHeadings.forEach(({ heading, lines }) => {
        const { top } = heading.getBoundingClientRect();
        const progress = Math.min(Math.max((start - top) / (start - end), 0), 1);
        const activeIndex = Math.min(lines.length - 1, Math.floor(progress * lines.length));

        lines.forEach((line, index) => {
          line.classList.toggle("is-active", index === activeIndex);
        });
      });
    };

    const requestHeadingUpdate = () => {
      if (!headingFrame) {
        headingFrame = window.requestAnimationFrame(updateHeadingHighlights);
      }
    };

    rebuildLines();
    updateHeadingHighlights();
    window.addEventListener("scroll", requestHeadingUpdate, { passive: true });
    window.addEventListener("resize", () => {
      rebuildLines();
      requestHeadingUpdate();
    });
  }

  if (floatingCta) {
    let applyVisible = false;

    const updateFloatingCta = () => {
      const pastHero = window.scrollY > window.innerHeight * 0.7;
      floatingCta.classList.toggle("is-visible", pastHero && !applyVisible);
    };

    if (applySection && "IntersectionObserver" in window) {
      const observer = new IntersectionObserver(
        ([entry]) => {
          applyVisible = entry.isIntersecting;
          updateFloatingCta();
        },
        { rootMargin: "0px 0px -20% 0px", threshold: 0 },
      );
      observer.observe(applySection);
    }

    updateFloatingCta();
    window.addEventListener("scroll", updateFloatingCta, { passive: true });
  }

  if (!canvas || reduceMotion) return;

  const ctx = canvas.getContext("2d");
  const particles = [];
  const config = {
    count: 60,
    linkDistance: 150,
    linkOpacity: 0.6,
    linkWidth: 1.6,
    speed: 0.85,
  };

  let width = 0;
  let height = 0;
  let ratio = 1;
  let frameId = 0;

  const resetParticle = (particle) => {
    particle.x = Math.random() * width;
    particle.y = Math.random() * height;
    particle.size = 1 + Math.random() * 2;
    particle.opacity = 0.3 + Math.random() * 0.35;
    particle.vx = (Math.random() - 0.5) * config.speed;
    particle.vy = (Math.random() - 0.5) * config.speed;
  };

  const resize = () => {
    ratio = Math.min(window.devicePixelRatio || 1, 2);
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = Math.floor(width * ratio);
    canvas.height = Math.floor(height * ratio);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);

    while (particles.length < config.count) {
      const particle = {};
      resetParticle(particle);
      particles.push(particle);
    }
  };

  const draw = () => {
    ctx.clearRect(0, 0, width, height);

    for (const particle of particles) {
      particle.x += particle.vx;
      particle.y += particle.vy;

      if (particle.x < -10) particle.x = width + 10;
      if (particle.x > width + 10) particle.x = -10;
      if (particle.y < -10) particle.y = height + 10;
      if (particle.y > height + 10) particle.y = -10;

      ctx.beginPath();
      ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255, 255, 255, ${particle.opacity})`;
      ctx.fill();
    }

    for (let i = 0; i < particles.length; i += 1) {
      for (let j = i + 1; j < particles.length; j += 1) {
        const a = particles[i];
        const b = particles[j];
        const dx = a.x - b.x;
        const dy = a.y - b.y;
        const distance = Math.hypot(dx, dy);

        if (distance < config.linkDistance) {
          const alpha = (1 - distance / config.linkDistance) * config.linkOpacity;
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.strokeStyle = `rgba(127, 29, 29, ${alpha})`;
          ctx.lineWidth = config.linkWidth;
          ctx.stroke();
        }
      }
    }

    frameId = window.requestAnimationFrame(draw);
  };

  resize();
  draw();
  window.addEventListener("resize", resize);
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      window.cancelAnimationFrame(frameId);
    } else {
      draw();
    }
  });
})();
