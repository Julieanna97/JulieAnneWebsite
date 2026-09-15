"use client";

import {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  Canvas,
} from "@react-three/fiber";

import {
  AnimatePresence,
  motion,
} from "framer-motion";

import {
  ACESFilmicToneMapping,
  SRGBColorSpace,
} from "three";

import type {
  PortfolioSection,
  ProjectId,
  SectionId,
} from "./types";

import {
  HOME_CAMERA_DESKTOP,
  HOME_CAMERA_MOBILE,
  SECTIONS,
} from "./sceneConfig";

import AdventureSceneContent from "./scene/AdventureSceneContent";

import AutomaticHotspotController, {
  type DetectedHotspot,
  type HotspotProjection,
} from "./scene/AutomaticHotspotController";

import AutoCardStack, {
  type AutoCardStackHandle,
} from "./annotations/AutoCardStack";

import SceneShortcutNav from "./navigation/SceneShortcutNav";

import ProjectsOverviewModal from "./modals/ProjectsOverviewModal";
import SectionDetailModal from "./modals/SectionDetailModal";
import ProjectCaseStudyModal from "./modals/ProjectCaseStudyModal";

import SakuraThemeStyles from "./SakuraThemeStyles";

export type HeroSceneProps = {
  onSceneReady?: () => void;
};

type SectionDetailId =
  | "about"
  | "credits";

type FocusState = {
  focused: boolean;
  returning: boolean;
};

const FOCUS_STATE_EVENT =
  "adventure:focus-state";

const RETURN_HOME_EVENT =
  "adventure:return-home";

const INTRO_EVENT =
  "adventure:intro";

const MODAL_REVEAL_STATE_EVENT =
  "adventure:modal-reveal-state";

export default function HeroScene({
  onSceneReady,
}: HeroSceneProps) {
  const [
    viewportWidth,
    setViewportWidth,
  ] = useState(() => {
    if (
      typeof window ===
      "undefined"
    ) {
      return 1440;
    }

    return window.innerWidth;
  });

  const [
    activeId,
    setActiveId,
  ] =
    useState<SectionId | null>(
      null,
    );

  const [
    cardStack,
    setCardStack,
  ] =
    useState<SectionId[]>(
      [],
    );

  const [
    projectsOverviewOpen,
    setProjectsOverviewOpen,
  ] = useState(false);

  const [
    selectedProjectId,
    setSelectedProjectId,
  ] =
    useState<ProjectId | null>(
      null,
    );

  const [
    selectedSectionDetail,
    setSelectedSectionDetail,
  ] =
    useState<SectionDetailId | null>(
      null,
    );

  const [
    focusState,
    setFocusState,
  ] = useState<FocusState>({
    focused: false,
    returning: false,
  });

  /*
   * A reversible modal remains mounted
   * while it is stored above the screen.
   *
   * true means:
   * the homepage is fully visible and
   * should behave normally.
   */
  const [
    modalRevealReleased,
    setModalRevealReleased,
  ] = useState(false);

  /*
   * Used only when the user is back on the 3D home
   * and clicks the SAME retained modal in the top nav.
   *
   * Incrementing the matching generation changes the
   * component key, causing a clean remount. That lets
   * the modal reuse its original first-open Framer
   * Motion transition without adding animation state
   * inside the modal itself.
   */
  const [
    projectsModalOpenGeneration,
    setProjectsModalOpenGeneration,
  ] = useState(0);

  const [
    sectionModalOpenGeneration,
    setSectionModalOpenGeneration,
  ] = useState(0);

  const autoCardStackRef =
    useRef<AutoCardStackHandle | null>(
      null,
    );

  const isMobile =
    viewportWidth < 768;

  const modalContentOpen =
    projectsOverviewOpen ||
    selectedProjectId !==
      null ||
    selectedSectionDetail !==
      null;

  /*
   * Visible modal = paused.
   *
   * Hidden/released reversible modal =
   * homepage fully interactive.
   */
  const interactionPaused =
    modalContentOpen &&
    !modalRevealReleased;

  useEffect(() => {
    const handleResize = () => {
      setViewportWidth(
        window.innerWidth,
      );
    };

    window.addEventListener(
      "resize",
      handleResize,
    );

    return () => {
      window.removeEventListener(
        "resize",
        handleResize,
      );
    };
  }, []);

  /*
   * Reset everything for the original
   * page entrance animation.
   */
  useEffect(() => {
    const handleIntro = () => {
      setActiveId(
        null,
      );

      setCardStack(
        [],
      );

      setModalRevealReleased(
        false,
      );

      setFocusState({
        focused: false,
        returning: false,
      });
    };

    window.addEventListener(
      INTRO_EVENT,
      handleIntro,
    );

    return () => {
      window.removeEventListener(
        INTRO_EVENT,
        handleIntro,
      );
    };
  }, []);

  /*
   * Listen for clicked-hotspot
   * camera state.
   */
  useEffect(() => {
    const handleFocusState = (
      event: Event,
    ) => {
      const customEvent =
        event as CustomEvent<{
          focused?: boolean;
          returning?: boolean;
        }>;

      setFocusState({
        focused: Boolean(
          customEvent.detail
            ?.focused,
        ),

        returning: Boolean(
          customEvent.detail
            ?.returning,
        ),
      });
    };

    window.addEventListener(
      FOCUS_STATE_EVENT,
      handleFocusState,
    );

    return () => {
      window.removeEventListener(
        FOCUS_STATE_EVENT,
        handleFocusState,
      );
    };
  }, []);

  /*
   * Listen for the reversible modal.
   *
   * true:
   * modal is stored above viewport,
   * homepage is fully interactive.
   *
   * false:
   * modal is visible / returning,
   * homepage is paused again.
   */
  useEffect(() => {
    const handleModalRevealState = (
      event: Event,
    ) => {
      const customEvent =
        event as CustomEvent<{
          released?: boolean;
        }>;

      setModalRevealReleased(
        Boolean(
          customEvent.detail
            ?.released,
        ),
      );
    };

    window.addEventListener(
      MODAL_REVEAL_STATE_EVENT,
      handleModalRevealState,
    );

    return () => {
      window.removeEventListener(
        MODAL_REVEAL_STATE_EVENT,
        handleModalRevealState,
      );
    };
  }, []);

  /*
   * Build the automatic popup-card
   * stack from visited hotspots.
   */
  const handleDetectedHotspot =
    useCallback(
      ({
        id,
      }: DetectedHotspot) => {
        setActiveId(
          id,
        );

        setCardStack(
          (
            currentStack,
          ) => {
            if (
              currentStack.length ===
              0
            ) {
              return [
                id,
              ];
            }

            const currentTop =
              currentStack[
                currentStack.length -
                  1
              ];

            if (
              currentTop ===
              id
            ) {
              return currentStack;
            }

            const existingIndex =
              currentStack.lastIndexOf(
                id,
              );

            if (
              existingIndex !==
              -1
            ) {
              return currentStack.slice(
                0,
                existingIndex +
                  1,
              );
            }

            return [
              ...currentStack,
              id,
            ].slice(
              -SECTIONS.length,
            );
          },
        );
      },
      [],
    );

  const updateHotspotProjection =
    useCallback(
      (
        projection:
          HotspotProjection,
      ) => {
        autoCardStackRef.current
          ?.updateHotspotPosition(
            projection,
          );
      },
      [],
    );

  const stackedSections =
    useMemo(
      () =>
        cardStack
          .map(
            (
              id,
            ) =>
              SECTIONS.find(
                (
                  section,
                ) =>
                  section.id ===
                  id,
              ),
          )
          .filter(
            (
              section,
            ): section is PortfolioSection =>
              section !==
              undefined,
          ),
      [
        cardStack,
      ],
    );

  /*
   * Remove every modal state.
   *
   * Used before switching from a
   * released/stored modal to another
   * page or case study.
   */
  const closeAllModalContent =
    useCallback(() => {
      setProjectsOverviewOpen(
        false,
      );

      setSelectedProjectId(
        null,
      );

      setSelectedSectionDetail(
        null,
      );
    }, []);

  /*
   * Smoothly replace a modal that is
   * currently stored above the viewport.
   */
  const openReplacingReleasedModal =
    useCallback(
      (
        openNext:
          () => void,
      ) => {
        if (
          !modalRevealReleased
        ) {
          openNext();

          return;
        }

        setModalRevealReleased(
          false,
        );

        closeAllModalContent();

        window.requestAnimationFrame(
          () => {
            openNext();
          },
        );
      },
      [
        closeAllModalContent,
        modalRevealReleased,
      ],
    );

  const handleProjectSelect =
    useCallback(
      (
        id: ProjectId,
      ) => {
        openReplacingReleasedModal(
          () => {
            setProjectsOverviewOpen(
              false,
            );

            setSelectedSectionDetail(
              null,
            );

            setSelectedProjectId(
              id,
            );
          },
        );
      },
      [
        openReplacingReleasedModal,
      ],
    );

  const handleOpenSectionDetail =
    useCallback(
      (
        id:
          SectionDetailId,
      ) => {
        openReplacingReleasedModal(
          () => {
            setProjectsOverviewOpen(
              false,
            );

            setSelectedProjectId(
              null,
            );

            setSelectedSectionDetail(
              id,
            );
          },
        );
      },
      [
        openReplacingReleasedModal,
      ],
    );

  /*
   * Selecting a project from the visible
   * Projects overview switches directly
   * to its case study.
   */
  const handleOverviewProjectSelect =
    useCallback(
      (
        id: ProjectId,
      ) => {
        setModalRevealReleased(
          false,
        );

        setProjectsOverviewOpen(
          false,
        );

        setSelectedSectionDetail(
          null,
        );

        setSelectedProjectId(
          id,
        );
      },
      [],
    );

  /*
   * Top-right Projects / Credits /
   * About Me navigation.
   *
   * Released modal:
   * works normally and replaces it.
   *
   * Visible modal:
   * stays disabled.
   */
  const handleShortcutSelect =
    useCallback(
      (
        id: SectionId,
      ) => {
        if (
          interactionPaused
        ) {
          return;
        }

        /*
         * SAME RELEASED MODAL:
         *
         * Do not close + reopen the exact same
         * React state. The current modal is still
         * mounted above Home and its reveal hook
         * owns hidden/inert DOM state.
         *
         * Reusing the same "projects" / "about" /
         * "credits" value can race with React's
         * batched close/open updates and leave the
         * retained modal hidden while the scene
         * briefly pauses.
         *
         * Restore the already-mounted modal instead.
         */
        const sameReleasedModal =
          modalRevealReleased &&
          (
            (
              id ===
                "projects" &&
              projectsOverviewOpen
            ) ||
            (
              (
                id ===
                  "about" ||
                id ===
                  "credits"
              ) &&
              selectedSectionDetail ===
                id
            )
          );

        if (
          sameReleasedModal
        ) {
          /*
           * The retained modal is currently hidden above
           * the 3D scene. Clicking its own nav item should
           * feel exactly like a fresh open, not like a
           * reverse-scroll restore.
           *
           * First give interaction ownership back to the
           * modal, then remount only that modal component.
           * Its EXISTING initial -> animate transition
           * will run naturally from the beginning.
           */
          setModalRevealReleased(
            false,
          );

          if (
            id === "projects"
          ) {
            setProjectsModalOpenGeneration(
              (generation) =>
                generation + 1,
            );

            return;
          }

          setSectionModalOpenGeneration(
            (generation) =>
              generation + 1,
          );

          return;
        }

        openReplacingReleasedModal(
          () => {
            if (
              id ===
              "projects"
            ) {
              setSelectedProjectId(
                null,
              );

              setSelectedSectionDetail(
                null,
              );

              setProjectsOverviewOpen(
                true,
              );

              return;
            }

            if (
              id ===
                "about" ||
              id ===
                "credits"
            ) {
              setProjectsOverviewOpen(
                false,
              );

              setSelectedProjectId(
                null,
              );

              setSelectedSectionDetail(
                id,
              );
            }
          },
        );
      },
      [
        interactionPaused,
        modalRevealReleased,
        openReplacingReleasedModal,
        projectsOverviewOpen,
        selectedSectionDetail,
      ],
    );

  const handleReturnHome =
    useCallback(() => {
      if (
        focusState.returning
      ) {
        return;
      }

      window.dispatchEvent(
        new CustomEvent(
          RETURN_HOME_EVENT,
        ),
      );
    }, [
      focusState.returning,
    ]);

  const closeProjectsOverview =
    useCallback(() => {
      setModalRevealReleased(
        false,
      );

      setProjectsOverviewOpen(
        false,
      );
    }, []);

  const closeSectionDetail =
    useCallback(() => {
      setModalRevealReleased(
        false,
      );

      setSelectedSectionDetail(
        null,
      );
    }, []);

  const closeProjectCaseStudy =
    useCallback(() => {
      setModalRevealReleased(
        false,
      );

      setSelectedProjectId(
        null,
      );
    }, []);

  return (
    <section className="adventure-scene-shell">
      <Canvas
        shadows
        dpr={
          isMobile
            ? [
                1,
                1.4,
              ]
            : [
                1,
                1.85,
              ]
        }
        camera={{
          position:
            isMobile
              ? HOME_CAMERA_MOBILE
              : HOME_CAMERA_DESKTOP,

          fov:
            isMobile
              ? 43
              : 36,

          near:
            0.1,

          far:
            300,
        }}
        gl={{
          antialias:
            false,

          alpha:
            false,

          powerPreference:
            "high-performance",
        }}
        onCreated={({
          gl,
        }) => {
          gl.outputColorSpace =
            SRGBColorSpace;

          gl.toneMapping =
            ACESFilmicToneMapping;

          gl.toneMappingExposure =
            0.92;

          gl.setClearColor(
            "#000000",
            1,
          );
        }}
        style={{
          position:
            "relative",

          zIndex:
            2,

          touchAction:
            "none",
        }}
      >
        <Suspense
          fallback={
            null
          }
        >
          <AdventureSceneContent
            viewportWidth={
              viewportWidth
            }
            activeId={
              activeId
            }
            onActiveChange={
              setActiveId
            }
            onProjectSelect={
              handleProjectSelect
            }
            onOpenSectionDetail={
              handleOpenSectionDetail
            }
            interactionPaused={
              interactionPaused
            }
            onSceneReady={
              onSceneReady
            }
          />

          <AutomaticHotspotController
            activeId={
              activeId
            }
            paused={
              interactionPaused
            }
            onDetectedHotspot={
              handleDetectedHotspot
            }
            onProjection={
              updateHotspotProjection
            }
          />
        </Suspense>
      </Canvas>

      <SceneShortcutNav
        disabled={
          interactionPaused
        }
        onSelect={
          handleShortcutSelect
        }
      />

      {/*
       * IMPORTANT EMPTY-CARD FIX:
       *
       * Never render the stack when no
       * actual hotspot/card is available.
       *
       * Previously the empty stack shell
       * could remain visible after a modal
       * reveal while activeId was null.
       */}
      {!interactionPaused &&
        activeId !== null &&
        stackedSections.length >
          0 && (
          <AutoCardStack
            ref={
              autoCardStackRef
            }
            sections={
              stackedSections
            }
            activeId={
              activeId
            }
            onProjectSelect={
              handleProjectSelect
            }
            onOpenSectionDetail={
              handleOpenSectionDetail
            }
          />
        )}

      <div className="adventure-home-button-slot">
        <AnimatePresence
          initial={
            false
          }
        >
          {focusState.focused &&
            !focusState.returning && (
              <motion.button
                key="adventure-home"
                type="button"
                className="adventure-home-button"
                onClick={
                  handleReturnHome
                }
                aria-label="Return to the full model view"
                initial={{
                  opacity:
                    0,

                  y:
                    38,

                  scale:
                    0.92,

                  filter:
                    "blur(7px)",
                }}
                animate={{
                  opacity:
                    1,

                  y:
                    0,

                  scale:
                    1,

                  filter:
                    "blur(0px)",
                }}
                exit={{
                  opacity:
                    0,

                  y:
                    82,

                  scale:
                    0.9,

                  filter:
                    "blur(8px)",
                }}
                whileHover={{
                  y:
                    -3,

                  scale:
                    1.045,
                }}
                whileTap={{
                  scale:
                    0.94,
                }}
                transition={{
                  duration:
                    0.3,

                  ease: [
                    0.22,
                    1,
                    0.36,
                    1,
                  ],
                }}
              >
                <span
                  className="adventure-home-button__icon"
                  aria-hidden="true"
                />

                <span className="adventure-home-button__label">
                  Home
                </span>
              </motion.button>
            )}
        </AnimatePresence>
      </div>

      <ProjectsOverviewModal
        key={`projects-overview-${projectsModalOpenGeneration}`}
        open={
          projectsOverviewOpen
        }
        onClose={
          closeProjectsOverview
        }
        onProjectSelect={
          handleOverviewProjectSelect
        }
      />

      <SectionDetailModal
        key={`section-detail-${sectionModalOpenGeneration}`}
        detailId={
          selectedSectionDetail
        }
        onClose={
          closeSectionDetail
        }
      />

      <ProjectCaseStudyModal
        /*
         * Every case study must start with a completely
         * fresh scroll/reveal lifecycle.
         *
         * Without this key, changing from project A to
         * project B can reuse the same mounted modal
         * instance. That can carry over the previous
         * case study's scroll position, reveal state,
         * pointer-event release state, lift transform,
         * and scroll-button offset.
         *
         * Keying by project id cleanly remounts the case
         * study only when the selected project changes.
         * While the same project is merely scrolled out
         * to reveal the 3D home, the key stays unchanged,
         * so reverse-scrolling into that same project
         * continues to work exactly as before.
         */
        key={
          selectedProjectId ??
          "project-case-study-idle"
        }
        projectId={
          selectedProjectId
        }
        onClose={
          closeProjectCaseStudy
        }
      />

      <style jsx global>{`
        .adventure-scene-shell {
          position:
            relative;

          width:
            100%;

          height:
            100vh;

          height:
            100dvh;

          min-height:
            520px;

          overflow:
            hidden;

          background:
            #000000;

          isolation:
            isolate;
        }

        .adventure-scene-shell
          canvas {
          display:
            block;
        }

        .adventure-mobile-annotation-layer,
        .adventure-bottom-nav {
          display:
            none !important;
        }

        .adventure-home-button-slot {
          position:
            absolute;

          right:
            0;

          bottom:
            max(
              28px,
              calc(
                18px +
                  env(
                    safe-area-inset-bottom
                  )
              )
            );

          left:
            0;

          z-index:
            90;

          display:
            flex;

          align-items:
            center;

          justify-content:
            center;

          pointer-events:
            none;
        }

        .adventure-home-button {
          position:
            relative;

          display:
            inline-flex;

          min-width:
            150px;

          min-height:
            56px;

          align-items:
            center;

          justify-content:
            center;

          gap:
            10px;

          overflow:
            hidden;

          border:
            1px solid
            rgba(
              255,
              128,
              201,
              0.46
            );

          border-radius:
            999px;

          outline:
            none;

          background:
            linear-gradient(
              135deg,
              rgba(
                45,
                16,
                63,
                0.97
              ),
              rgba(
                20,
                10,
                38,
                0.97
              )
            );

          box-shadow:
            0 0 0
              1px
              rgba(
                255,
                255,
                255,
                0.045
              )
              inset,
            0 0
              26px
              rgba(
                255,
                75,
                174,
                0.21
              ),
            0 17px
              43px
              rgba(
                0,
                0,
                0,
                0.48
              );

          padding:
            0 22px
            0 17px;

          color:
            #ffe8f7;

          cursor:
            pointer;

          font-family:
            var(
              --font-body
            ),
            Arial,
            sans-serif;

          font-size:
            11px;

          font-weight:
            900;

          letter-spacing:
            0.11em;

          text-transform:
            uppercase;

          pointer-events:
            auto;

          transition:
            color
              180ms
              ease,
            border-color
              180ms
              ease,
            background
              200ms
              ease,
            box-shadow
              200ms
              ease;
        }

        .adventure-home-button::before {
          content:
            "";

          position:
            absolute;

          inset:
            0;

          background:
            linear-gradient(
              120deg,
              transparent
                16%,
              rgba(
                255,
                255,
                255,
                0.13
              )
                48%,
              transparent
                78%
            );

          opacity:
            0;

          transform:
            translateX(
              -70%
            );

          transition:
            opacity
              180ms
              ease,
            transform
              380ms
              ease;

          pointer-events:
            none;
        }

        .adventure-home-button::after {
          content:
            "";

          position:
            absolute;

          inset:
            6px;

          border-radius:
            inherit;

          background:
            radial-gradient(
              circle at
                50%
                100%,
              rgba(
                255,
                74,
                169,
                0.27
              ),
              transparent
                68%
            );

          opacity:
            0.62;

          pointer-events:
            none;
        }

        .adventure-home-button:hover {
          border-color:
            rgba(
              255,
              205,
              235,
              0.94
            );

          background:
            linear-gradient(
              135deg,
              #a968ef,
              #ff4fa9
            );

          color:
            #ffffff;

          box-shadow:
            0 0 0
              1px
              rgba(
                255,
                255,
                255,
                0.14
              )
              inset,
            0 0
              38px
              rgba(
                255,
                75,
                174,
                0.54
              ),
            0 20px
              48px
              rgba(
                0,
                0,
                0,
                0.54
              );
        }

        .adventure-home-button:hover::before {
          opacity:
            1;

          transform:
            translateX(
              70%
            );
        }

        .adventure-home-button:focus-visible {
          outline:
            3px solid
            #69dfff;

          outline-offset:
            4px;
        }

        .adventure-home-button__icon,
        .adventure-home-button__label {
          position:
            relative;

          z-index:
            2;
        }

        .adventure-home-button__icon {
          display:
            block;

          width:
            32px;

          height:
            32px;

          flex:
            0 0
            32px;

          filter:
            drop-shadow(
              0 0
                8px
                rgba(
                  255,
                  104,
                  183,
                  0.56
                )
            );

          transition:
            filter
              180ms
              ease,
            transform
              220ms
              ease;
        }

        .adventure-home-button__icon::before,
        .adventure-home-button__icon::after {
          content:
            "";

          position:
            absolute;

          top:
            50%;

          left:
            50%;

          width:
            26px;

          height:
            2px;

          border-radius:
            999px;

          background:
            #ff8acb;

          transform-origin:
            center;

          transition:
            width
              180ms
              ease,
            height
              180ms
              ease,
            background
              180ms
              ease,
            box-shadow
              180ms
              ease;
        }

        .adventure-home-button__icon::before {
          transform:
            translate(
              -50%,
              -50%
            )
            rotate(
              45deg
            );
        }

        .adventure-home-button__icon::after {
          transform:
            translate(
              -50%,
              -50%
            )
            rotate(
              -45deg
            );
        }

        .adventure-home-button:hover
          .adventure-home-button__icon {
          filter:
            drop-shadow(
              0 0
                11px
                rgba(
                  255,
                  255,
                  255,
                  0.64
                )
            );

          transform:
            rotate(
              90deg
            )
            scale(
              1.08
            );
        }

        .adventure-home-button:hover
          .adventure-home-button__icon::before,
        .adventure-home-button:hover
          .adventure-home-button__icon::after {
          width:
            28px;

          height:
            2.5px;

          background:
            #ffffff;

          box-shadow:
            0 0
              8px
              rgba(
                255,
                255,
                255,
                0.44
              );
        }

        .adventure-home-button__label {
          line-height:
            1;
        }

        @media (
          max-width:
            767px
        ) {
          .adventure-scene-shell {
            min-height:
              100dvh;
          }

          .adventure-home-button-slot {
            bottom:
              max(
                16px,
                calc(
                  12px +
                    env(
                      safe-area-inset-bottom
                    )
                )
              );
          }

          .adventure-home-button {
            min-width:
              136px;

            min-height:
              50px;

            padding:
              0 18px
              0 14px;

            font-size:
              10px;
          }

          .adventure-home-button__icon {
            width:
              29px;

            height:
              29px;

            flex-basis:
              29px;
          }

          .adventure-home-button__icon::before,
          .adventure-home-button__icon::after {
            width:
              23px;
          }

          .adventure-home-button:hover
            .adventure-home-button__icon::before,
          .adventure-home-button:hover
            .adventure-home-button__icon::after {
            width:
              25px;
          }
        }

        @media (
          prefers-reduced-motion:
            reduce
        ) {
          .adventure-home-button,
          .adventure-home-button::before,
          .adventure-home-button__icon,
          .adventure-home-button__icon::before,
          .adventure-home-button__icon::after {
            transition-duration:
              0.01ms !important;
          }
        }
      `}</style>

      <SakuraThemeStyles />
    </section>
  );
}