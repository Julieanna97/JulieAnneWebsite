"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import {
  AnimatePresence,
  motion,
  useReducedMotion,
} from "framer-motion";

import type {
  ProjectId,
} from "../types";

import {
  PROJECT_CASE_STUDIES,
} from "../portfolioData";

import SceneReturnButton from "./SceneReturnButton";

import ScrollToTopButton from "@/components/ScrollToTopButton";

import useModalHomeReveal from "./useModalHomeReveal";

type ProjectCaseStudyModalProps = {
  projectId: ProjectId | null;
  onClose: () => void;
};

export default function ProjectCaseStudyModal({
  projectId,
  onClose,
}: ProjectCaseStudyModalProps) {
  const reduceMotion =
    useReducedMotion();

  const returnButtonRef =
    useRef<HTMLButtonElement>(
      null,
    );

  const scrollRef =
    useRef<HTMLElement | null>(
      null,
    );

  const revealRef =
    useRef<HTMLDivElement | null>(
      null,
    );

  const backdropRef =
    useRef<HTMLDivElement | null>(
      null,
    );

  /*
   * This entire wrapper moves upward.
   *
   * The pink ScrollToTopButton is also
   * inside this wrapper so it leaves the
   * screen together with the case study.
   */
  const liftLayerRef =
    useRef<HTMLDivElement | null>(
      null,
    );

  const [
    activeImageIndex,
    setActiveImageIndex,
  ] = useState(0);

  const project = projectId
    ? PROJECT_CASE_STUDIES[
        projectId
      ]
    : null;

  const safeImageIndex =
    project
      ? Math.min(
          activeImageIndex,
          Math.max(
            project.images.length -
              1,
            0,
          ),
        )
      : 0;

  const activeImage =
    project?.images[
      safeImageIndex
    ];

  const handleHomeRevealComplete =
    useCallback(() => {
      /*
       * Remove the case study so
       * the real scene becomes active.
       */
      onClose();

      /*
       * Then restore the normal
       * homepage camera/orbit.
       */
      window.requestAnimationFrame(
        () => {
          window.requestAnimationFrame(
            () => {
              window.dispatchEvent(
                new CustomEvent(
                  "adventure:return-home",
                ),
              );
            },
          );
        },
      );
    }, [
      onClose,
    ]);

  useModalHomeReveal({
    active: Boolean(
      project,
    ),

    scrollRef,

    revealRef,

    liftRef:
      liftLayerRef,

    releaseRef:
      backdropRef,

    onComplete:
      handleHomeRevealComplete,
  });

  useEffect(() => {
    setActiveImageIndex(
      0,
    );
  }, [
    projectId,
  ]);

  useEffect(() => {
    if (!projectId) {
      return;
    }

    const previousOverflow =
      document.body.style.overflow;

    document.body.style.overflow =
      "hidden";

    const handleKeyDown = (
      event: KeyboardEvent,
    ) => {
      if (
        event.key ===
        "Escape"
      ) {
        onClose();
      }
    };

    window.addEventListener(
      "keydown",
      handleKeyDown,
    );

    const focusTimer =
      window.setTimeout(() => {
        returnButtonRef.current?.focus();
      }, 100);

    return () => {
      document.body.style.overflow =
        previousOverflow;

      window.removeEventListener(
        "keydown",
        handleKeyDown,
      );

      window.clearTimeout(
        focusTimer,
      );
    };
  }, [
    projectId,
    onClose,
  ]);

  const panelInitial =
    reduceMotion
      ? {
          opacity: 0,
        }
      : {
          opacity: 0,
          scale: 0.94,
          y: 44,
          borderRadius: 36,

          clipPath:
            "inset(7% 7% 7% 7% round 36px)",
        };

  const panelVisible = {
    opacity: 1,
    scale: 1,
    y: 0,
    borderRadius: 0,

    clipPath:
      "inset(0% 0% 0% 0% round 0px)",
  };

  const panelExit =
    reduceMotion
      ? {
          opacity: 0,
        }
      : {
          opacity: 0,
          scale: 0.95,
          y: 32,
          borderRadius: 36,

          clipPath:
            "inset(6% 6% 6% 6% round 36px)",
        };

  return (
    <AnimatePresence mode="wait">
      {project && (
        <motion.div
          ref={backdropRef}
          key={project.id}
          className="adventure-case-study-backdrop"
          role="presentation"
          initial={{
            opacity: 0,
          }}
          animate={{
            opacity: 1,
          }}
          exit={{
            opacity: 0,
          }}
          transition={{
            duration: reduceMotion
              ? 0.12
              : 0.32,
          }}
          onClick={onClose}
        >
          {/*
           * The case study and pink jump
           * button both live inside this
           * moving layer.
           */}
          <div
            ref={liftLayerRef}
            className="adventure-modal-lift-layer"
          >
            <motion.article
              ref={scrollRef}
              className="adventure-case-study-modal"
              role="dialog"
              aria-modal="true"
              aria-labelledby={`project-title-${project.id}`}
              initial={
                panelInitial
              }
              animate={
                panelVisible
              }
              exit={
                panelExit
              }
              transition={
                reduceMotion
                  ? {
                      duration:
                        0.12,
                    }
                  : {
                      opacity: {
                        duration:
                          0.25,
                      },

                      scale: {
                        type:
                          "spring",

                        stiffness:
                          230,

                        damping:
                          28,

                        mass:
                          0.9,
                      },

                      y: {
                        type:
                          "spring",

                        stiffness:
                          230,

                        damping:
                          28,

                        mass:
                          0.9,
                      },

                      borderRadius:
                        {
                          duration:
                            0.55,

                          ease: [
                            0.22,
                            1,
                            0.36,
                            1,
                          ],
                        },

                      clipPath: {
                        duration:
                          0.62,

                        ease: [
                          0.22,
                          1,
                          0.36,
                          1,
                        ],
                      },
                    }
              }
              onClick={(
                event,
              ) => {
                event.stopPropagation();
              }}
            >
              <div className="adventure-case-study-reveal-surface">
                <SceneReturnButton
                  buttonRef={
                    returnButtonRef
                  }
                  onClick={
                    onClose
                  }
                  ariaLabel={`Return to the 3D model from ${project.title}`}
                />

                <motion.div
                  className="adventure-full-view-body"
                  initial={
                    reduceMotion
                      ? {
                          opacity:
                            0,
                        }
                      : {
                          opacity:
                            0,

                          y: 24,
                        }
                  }
                  animate={{
                    opacity:
                      1,

                    y: 0,
                  }}
                  exit={{
                    opacity:
                      0,

                    y: 12,
                  }}
                  transition={{
                    duration:
                      reduceMotion
                        ? 0.12
                        : 0.48,

                    delay:
                      reduceMotion
                        ? 0
                        : 0.18,

                    ease: [
                      0.22,
                      1,
                      0.36,
                      1,
                    ],
                  }}
                >
                  <header className="adventure-case-study-header">
                    <p>
                      {
                        project.type
                      }
                    </p>

                    <h2
                      id={`project-title-${project.id}`}
                    >
                      {
                        project.title
                      }
                    </h2>

                    <p className="adventure-case-study-summary">
                      {
                        project.summary
                      }
                    </p>

                    <div className="adventure-case-study-meta">
                      <span>
                        <b>
                          Role
                        </b>

                        {
                          project.role
                        }
                      </span>

                      <span>
                        <b>
                          Period
                        </b>

                        {
                          project.period
                        }
                      </span>
                    </div>

                    {(project.externalUrl ||
                      project.githubUrl) && (
                      <div className="adventure-project-links">
                        {project.externalUrl && (
                          <a
                            className="adventure-project-external-link"
                            href={
                              project.externalUrl
                            }
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            {project.externalLabel ??
                              "Open live site ↗"}
                          </a>
                        )}

                        {project.githubUrl && (
                          <a
                            className="adventure-project-external-link"
                            href={
                              project.githubUrl
                            }
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            {project.githubLabel ??
                              "View GitHub repo ↗"}
                          </a>
                        )}
                      </div>
                    )}
                  </header>

                  <div className="adventure-case-study-grid">
                    <section className="adventure-case-study-gallery">
                      {activeImage ? (
                        <AnimatePresence
                          mode="wait"
                          initial={
                            false
                          }
                        >
                          <motion.img
                            key={
                              activeImage
                            }
                            src={
                              activeImage
                            }
                            alt={`${project.title} screenshot ${
                              safeImageIndex +
                              1
                            }`}
                            className="adventure-case-study-main-image"
                            initial={
                              reduceMotion
                                ? {
                                    opacity:
                                      0,
                                  }
                                : {
                                    opacity:
                                      0,

                                    scale:
                                      0.97,

                                    y: 12,
                                  }
                            }
                            animate={{
                              opacity:
                                1,

                              scale:
                                1,

                              y: 0,
                            }}
                            exit={{
                              opacity:
                                0,

                              scale:
                                0.98,

                              y: -8,
                            }}
                            transition={{
                              duration:
                                reduceMotion
                                  ? 0.12
                                  : 0.34,

                              ease: [
                                0.22,
                                1,
                                0.36,
                                1,
                              ],
                            }}
                          />
                        </AnimatePresence>
                      ) : (
                        <div className="adventure-case-study-empty-gallery">
                          <strong>
                            Screenshots
                            coming
                            soon
                          </strong>

                          <p>
                            Add
                            screenshots
                            for this
                            project
                            inside
                            its
                            folder
                            in{" "}
                            <code>
                              public/projects
                            </code>
                            .
                          </p>
                        </div>
                      )}

                      {project.images
                        .length >
                        1 && (
                        <div className="adventure-case-study-thumbnails">
                          {project.images.map(
                            (
                              image,
                              index,
                            ) => (
                              <motion.button
                                key={
                                  image
                                }
                                type="button"
                                className={
                                  safeImageIndex ===
                                  index
                                    ? "is-active"
                                    : ""
                                }
                                onClick={() => {
                                  setActiveImageIndex(
                                    index,
                                  );
                                }}
                                aria-label={`Show screenshot ${
                                  index +
                                  1
                                }`}
                                whileHover={{
                                  y: -3,
                                }}
                                whileTap={{
                                  scale:
                                    0.96,
                                }}
                              >
                                <img
                                  src={
                                    image
                                  }
                                  alt=""
                                />
                              </motion.button>
                            ),
                          )}
                        </div>
                      )}

                      {project.video && (
                        <video
                          className="adventure-case-study-video"
                          controls
                          preload="metadata"
                          poster={
                            project
                              .images[0]
                          }
                        >
                          <source
                            src={
                              project.video
                            }
                            type="video/mp4"
                          />

                          Your
                          browser
                          does
                          not
                          support
                          the
                          video
                          tag.
                        </video>
                      )}
                    </section>

                    <section className="adventure-case-study-content">
                      {project.overview && (
                        <div className="adventure-case-study-section">
                          <p className="adventure-detail-kicker">
                            About
                          </p>

                          <h3>
                            How it
                            came
                            together
                          </h3>

                          <div className="adventure-case-study-overview">
                            {project.overview.map(
                              (
                                paragraph,
                              ) => (
                                <p
                                  key={
                                    paragraph
                                  }
                                >
                                  {
                                    paragraph
                                  }
                                </p>
                              ),
                            )}
                          </div>
                        </div>
                      )}

                      {project.highlights && (
                        <div className="adventure-case-study-section">
                          <p className="adventure-detail-kicker">
                            A
                            closer
                            look
                          </p>

                          <h3>
                            Key
                            parts
                          </h3>

                          <div className="adventure-project-highlight-list">
                            {project.highlights.map(
                              (
                                highlight,
                                index,
                              ) => (
                                <article
                                  key={
                                    highlight.title
                                  }
                                >
                                  <span>
                                    {String(
                                      index +
                                        1,
                                    ).padStart(
                                      2,
                                      "0",
                                    )}
                                  </span>

                                  <div>
                                    <h4>
                                      {
                                        highlight.title
                                      }
                                    </h4>

                                    <p>
                                      {
                                        highlight.text
                                      }
                                    </p>
                                  </div>
                                </article>
                              ),
                            )}
                          </div>
                        </div>
                      )}

                      <div className="adventure-case-study-section">
                        <p className="adventure-detail-kicker">
                          My role
                        </p>

                        <h3>
                          What I
                          handled
                        </h3>

                        <ul>
                          {project.contributions.map(
                            (
                              contribution,
                            ) => (
                              <li
                                key={
                                  contribution
                                }
                              >
                                {
                                  contribution
                                }
                              </li>
                            ),
                          )}
                        </ul>
                      </div>

                      <div className="adventure-case-study-section">
                        <p className="adventure-detail-kicker">
                          Built
                          with
                        </p>

                        <h3>
                          Tools
                          and
                          technologies
                        </h3>

                        <div className="adventure-case-study-tags">
                          {project.technologies.map(
                            (
                              technology,
                            ) => (
                              <span
                                key={
                                  technology
                                }
                              >
                                {
                                  technology
                                }
                              </span>
                            ),
                          )}
                        </div>
                      </div>
                    </section>
                  </div>
                </motion.div>
              </div>

              <div
                ref={revealRef}
                className="adventure-home-reveal-track"
                aria-hidden="true"
              />
            </motion.article>

            {/*
             * IMPORTANT:
             *
             * This is INSIDE liftLayerRef,
             * so it moves upward together
             * with the case-study background.
             */}
            <div className="adventure-modal-scroll-button-carrier">
              <ScrollToTopButton
                scrollRef={scrollRef}
              />
            </div>
          </div>

          <style jsx global>{`
            .adventure-modal-lift-layer {
              position:
                absolute;

              inset: 0;

              width:
                100%;

              height:
                100%;

              will-change:
                transform;
            }

            .adventure-modal-scroll-button-carrier {
              position: absolute;
              inset: 0;

              width: 100%;
              height: 100%;

              pointer-events: none;

              transform:
                translate3d(
                  0,
                  calc(
                    -1 *
                    var(
                      --adventure-modal-native-scroll-shift,
                      0px
                    )
                  ),
                  0
                );

              will-change:
                transform;
            }

            .adventure-modal-scroll-button-carrier
              button {
              pointer-events:
                auto;
            }

            /*
             * Once the homepage starts entering,
             * hide the modal scrollbar entirely.
             */
            [data-home-reveal-active="true"] {
              scrollbar-width:
                none !important;
            }

            [data-home-reveal-active="true"]::-webkit-scrollbar {
              width:
                0 !important;

              height:
                0 !important;
            }

            .adventure-case-study-backdrop {
              background:
                transparent !important;

              backdrop-filter:
                none !important;

              -webkit-backdrop-filter:
                none !important;
            }

            .adventure-case-study-modal {
              background:
                transparent !important;

              padding:
                0 !important;

              /*
               * Firefox:
               * pink thumb + opaque modal-colored track.
               */
              scrollbar-color:
                #ff68b7
                #0b081a;
            }

            /*
             * Chrome / Edge / Safari:
             * keep the scrollbar area opaque while
             * the modal itself is visible.
             *
             * We intentionally do NOT change its
             * width or the existing pink thumb.
             */
            .adventure-case-study-modal::-webkit-scrollbar {
              background:
                #0b081a;
            }

            .adventure-case-study-modal::-webkit-scrollbar-track {
              background:
                linear-gradient(
                  180deg,
                  #0b081a
                    0%,
                  #070511
                    53%,
                  #03030a
                    100%
                );
            }

            .adventure-case-study-modal::-webkit-scrollbar-corner {
              background:
                #0b081a;
            }

            .adventure-case-study-reveal-surface {
              position:
                relative;

              width:
                100%;

              min-height:
                100vh;

              min-height:
                100dvh;

              box-sizing:
                border-box;

              padding:
                clamp(
                  82px,
                  9vw,
                  138px
                )
                clamp(
                  24px,
                  8vw,
                  150px
                )
                clamp(
                  80px,
                  9vw,
                  140px
                );

              background:
                radial-gradient(
                  circle at
                    86% 4%,
                  rgba(
                    118,
                    76,
                    222,
                    0.19
                  ),
                  transparent
                    30%
                ),
                radial-gradient(
                  circle at
                    8% 88%,
                  rgba(
                    255,
                    63,
                    159,
                    0.13
                  ),
                  transparent
                    34%
                ),
                radial-gradient(
                  circle at
                    52% 112%,
                  rgba(
                    105,
                    223,
                    255,
                    0.075
                  ),
                  transparent
                    34%
                ),
                linear-gradient(
                  180deg,
                  #0b081a
                    0%,
                  #070511
                    53%,
                  #03030a
                    100%
                );
            }

            .adventure-home-reveal-track {
              position:
                relative;

              display:
                block;

              width:
                100%;

              height:
                100vh;

              height:
                100dvh;

              min-height:
                100vh;

              flex:
                0 0 auto;

              background:
                transparent;

              pointer-events:
                none;
            }

            @media (
              max-width: 767px
            ) {
              .adventure-case-study-reveal-surface {
                padding:
                  68px
                  18px
                  calc(
                    70px +
                      env(
                        safe-area-inset-bottom
                      )
                  );
              }
            }
          `}</style>
        </motion.div>
      )}
    </AnimatePresence>
  );
}