# Julie Anne — Interactive 3D Developer Portfolio

An immersive developer portfolio built around an interactive 3D environment rather than a traditional static landing page.

Visitors can explore the scene, interact with portfolio hotspots, open project case studies, and move seamlessly between the 3D world and full-screen portfolio sections.

**Live site:** https://julieannecantillep.vercel.app  
**Repository:** https://github.com/Julieanna97/JulieAnneWebsite

---

## ✨ Highlights

- Interactive 3D portfolio environment
- Automatic scene rotation with manual camera controls
- Mouse and touch interaction
- Interactive scene hotspots and annotation cards
- Projects, About Me, and Credits navigation
- Detailed project case studies
- Reversible modal-to-3D scroll transitions
- Scroll back into the previously active section
- Same-section navigation with replayed opening transitions
- Responsive desktop and mobile behavior
- Animated UI and scene transitions
- Post-processing effects for the 3D environment
- Custom Sakura-inspired visual theme

---

## 🎮 How the Experience Works

The portfolio uses the 3D scene as its central navigation space.

1. Explore the scene and interact with hotspots or the navigation.
2. Open **Projects**, **About Me**, or **Credits**.
3. Scroll through the selected section.
4. Continue scrolling at the bottom to transition back into the 3D environment.
5. Scroll upward from the 3D scene to return to the section you were previously viewing.
6. Clicking that same section from the navigation opens it again from the top using its original entrance transition.

This creates a continuous experience between the portfolio content and the 3D world instead of treating them as separate pages.

---

## 🛠 Tech Stack

### Core

- **Next.js 15**
- **React 19**
- **TypeScript**
- **Tailwind CSS**

### 3D

- **Three.js**
- **React Three Fiber**
- **React Three Drei**
- **React Three Postprocessing**
- **Postprocessing**
- **React Spring Three**

### Motion & UI

- **Framer Motion**
- **GSAP**
- **Lucide React**
- **Lottie**

---

## 🧩 Key Systems

### 3D Scene

The main portfolio experience is rendered with React Three Fiber and Three.js. The scene supports automatic rotation, manual interaction, camera movement, interactive hotspots, lighting, atmosphere, and post-processing.

### Portfolio Navigation

The 3D scene connects to full-screen portfolio sections for:

- Projects
- About Me
- Credits
- Individual project case studies

### Reversible Modal Navigation

Portfolio sections remain connected to the 3D scene through a custom reversible scroll system.

When a section reaches its final reveal area, the interface returns control to the 3D environment without losing the current navigation context. Scrolling upward restores the retained section, while selecting it again from the navigation reopens it from the top.

### Project Case Studies

Projects can open into dedicated case-study views with additional information, imagery, technologies, project details, and navigation back into the portfolio experience.

---

## 📁 Project Structure

```text
JulieAnneWebsite/
├── public/
├── src/
│   ├── app/
│   │   ├── globals.css
│   │   ├── layout.tsx
│   │   └── page.tsx
│   │
│   ├── components/
│   │   └── hero-scene/
│   │       ├── annotations/
│   │       ├── modals/
│   │       ├── navigation/
│   │       ├── scene/
│   │       ├── HeroScene.tsx
│   │       ├── SakuraThemeStyles.tsx
│   │       ├── portfolioData.ts
│   │       └── sceneConfig.ts
│   │
│   ├── lib/
│   └── models/
│
├── next.config.mjs
├── tailwind.config.js
├── tsconfig.json
└── package.json
```

The exact structure may continue evolving as the portfolio grows.

---

## 🚀 Getting Started

### Prerequisites

Use a recent Node.js LTS release and npm.

### Clone the repository

```bash
git clone https://github.com/Julieanna97/JulieAnneWebsite.git
cd JulieAnneWebsite
```

### Install dependencies

```bash
npm install
```

### Start the development server

```bash
npm run dev
```

Then open:

```text
http://localhost:3000
```

---

## 📦 Available Scripts

```bash
npm run dev
```

Runs the Next.js development server.

```bash
npm run build
```

Creates a production build.

```bash
npm run start
```

Runs the production server after building the project.

---

## 🏗 Production Build

Before deploying changes, run:

```bash
npm run build
```

Then, if needed, test the production build locally:

```bash
npm run start
```

---

## 🧪 Interaction Testing

Because the portfolio contains custom 3D and reversible navigation behavior, changes should be tested across complete interaction flows rather than only individual components.

Useful regression checks include:

```text
Projects → scroll to 3D → scroll back to Projects
Projects → scroll to 3D → click Projects again
About Me → scroll to 3D → scroll back to About Me
About Me → scroll to 3D → click About Me again
Credits → scroll to 3D → scroll back to Credits
Credits → scroll to 3D → click Credits again
Section A → scroll to 3D → open Section B
Project → open case study → return to the main experience
```

Also verify:

- 3D rotation and pointer controls
- navigation links
- scene hotspots
- modal scrolling
- mouse wheel behavior
- trackpad behavior
- touch behavior
- desktop layouts
- mobile layouts

---

## 🎨 Design Direction

The site combines a dark cinematic 3D environment with a Sakura-inspired interface using pink, violet, cyan, and deep-night tones.

The goal is to make the portfolio feel like an explorable digital space while keeping project information readable and accessible.

---

## ♿ Accessibility & UX Considerations

The interface includes behavior for:

- keyboard interaction
- reduced-motion preferences where supported
- controlled focus inside full-screen content
- responsive interaction states
- touch and pointer input
- separation between modal interaction and 3D scene interaction

The project continues to evolve as interaction and accessibility edge cases are discovered.

---

## 🙏 Credits

This portfolio was built using the open-source libraries listed in the tech stack above.

Third-party models, visual assets, media, and other project-specific attributions are documented in the portfolio's **Credits** section where applicable.

---

## 👩‍💻 Author

**Julie Anne Cantillep**

Built as a personal developer portfolio and interactive showcase of web development, UI engineering, animation, and 3D web experimentation.

- Live portfolio: https://julieannecantillep.vercel.app
- GitHub: https://github.com/Julieanna97

---

## 📄 License

This repository is currently marked **UNLICENSED**.

Unless permission is explicitly granted, the source code and original portfolio assets are not licensed for redistribution or reuse.

---

<p align="center">
  Built with Next.js, React Three Fiber, Three.js, Framer Motion, GSAP, and a lot of experimentation ✨
</p>
