"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import {
  useThree,
  type ThreeEvent,
} from "@react-three/fiber";

import {
  OrbitControls,
} from "@react-three/drei";

import {
  Bloom,
  EffectComposer,
  SSAO,
  Vignette,
} from "@react-three/postprocessing";

import {
  BlendFunction,
} from "postprocessing";

import type {
  PerspectiveCamera,
} from "three";

import {
  MOUSE,
  TOUCH,
  Vector3,
} from "three";

import gsap from "gsap";

import MysteriousAdventureModel from "../../../models/MysteriousAdventureModel";

import type {
  PortfolioSection,
  ProjectId,
  SectionId,
} from "../types";

import {
  ABOUT_CAMERA_MOBILE,
  CREDITS_CAMERA_MOBILE,
  ENABLE_LIGHT_DEBUGGER,
  HOME_CAMERA_DESKTOP,
  HOME_CAMERA_MOBILE,
  HOME_TARGET,
  INTRO_CAMERA_DESKTOP,
  INTRO_CAMERA_MOBILE,
  INTRO_STREET_CAMERA_DESKTOP,
  INTRO_STREET_CAMERA_MOBILE,
  INTRO_STREET_TARGET,
  INTRO_ZOOM_DURATION,
  PROJECTS_CAMERA_MOBILE,
  SECTIONS,
} from "../sceneConfig";

import NumberHotspot from "../annotations/NumberHotspot";

import BackAlleyPinkGlow from "./BackAlleyPinkGlow";
import ConcreteRooftopGround from "./ConcreteRooftopGround";
import ExistingStreetSignOverlay from "./ExistingStreetSignOverlay";
import FloatingHeart from "./FloatingHeart";
import GroundGraffiti from "./GroundGraffiti";
import RooftopVideoAdvertisement from "./RooftopVideoAdvertisement";
import SakuraAtmosphere from "./SakuraAtmosphere";
import SquareWallVideoAdvertisement from "./SquareWallVideoAdvertisement";
import TokyoStreetLampGlow from "./TokyoStreetLampGlow";
import TrainStreetLampGlow from "./TrainStreetLampGlow";

export type AdventureSceneContentProps = {
  viewportWidth: number;

  activeId:
    | SectionId
    | null;

  onActiveChange: (
    id:
      | SectionId
      | null,
  ) => void;

  onProjectSelect: (
    id: ProjectId,
  ) => void;

  onOpenSectionDetail: (
    id:
      | "about"
      | "credits",
  ) => void;

  interactionPaused?: boolean;

  onSceneReady?: () => void;
};

type VectorTuple =
  readonly [
    number,
    number,
    number,
  ];

const MODAL_REVEAL_STATE_EVENT =
  "adventure:modal-reveal-state";

const MODAL_REVEAL_FORWARD_ANGLE =
  Math.PI / 10;

const MANUAL_HOTSPOT_EVENT =
  "adventure:manual-hotspot";

const FOCUS_STATE_EVENT =
  "adventure:focus-state";

const RETURN_HOME_EVENT =
  "adventure:return-home";

const SELECT_SECTION_EVENT =
  "adventure:select";

const INTRO_EVENT =
  "adventure:intro";

const MANUAL_DRAG_THRESHOLD =
  5;

const WHEEL_ROTATION_SENSITIVITY =
  0.00125;

const MAX_WHEEL_ROTATION_STEP =
  0.18;

const WORLD_UP =
  new Vector3(
    0,
    1,
    0,
  );

export default function AdventureSceneContent({
  viewportWidth,
  activeId,
  onActiveChange,
  onProjectSelect,
  onOpenSectionDetail,
  interactionPaused = false,
  onSceneReady,
}: AdventureSceneContentProps) {
  const {
    camera,
    scene,
    gl,
  } = useThree();

  const controlsRef =
    useRef<any>(null);

  const readyRef =
    useRef(false);

  const readyFrameOneRef =
    useRef<number | null>(
      null,
    );

  const readyFrameTwoRef =
    useRef<number | null>(
      null,
    );

  const cameraTimelineRef =
    useRef<
      gsap.core.Timeline | null
    >(null);

  /*
   * true while a reversible modal
   * remains mounted above the viewport.
   *
   * This is used for the special
   * forward-only wheel behavior.
   */
  const [
    modalRevealReleased,
    setModalRevealReleased,
  ] = useState(false);

  const [
    moving,
    setMoving,
  ] = useState(false);

  const [
    focusedSectionId,
    setFocusedSectionId,
  ] =
    useState<SectionId | null>(
      null,
    );

  const [
    idleRotationEnabled,
    setIdleRotationEnabled,
  ] = useState(false);

  const automaticRotationWantedRef =
    useRef(false);

  const visitorInteractedRef =
    useRef(false);

  const returnOrbitAngleRef =
    useRef<number | null>(
      null,
    );

  const pointerDownRef =
    useRef(false);

  const pointerStartRef =
    useRef({
      x: 0,
      y: 0,
    });

  const activePointerIdRef =
    useRef<number | null>(
      null,
    );

  const [
    debugClickPoint,
    setDebugClickPoint,
  ] =
    useState<VectorTuple | null>(
      null,
    );

  const compact =
    viewportWidth < 768;

  const homeCamera =
    compact
      ? HOME_CAMERA_MOBILE
      : HOME_CAMERA_DESKTOP;

  /*
   * HeroScene now sends the effective
   * pause state.
   *
   * It becomes false when a reversible
   * modal is completely above the screen.
   */
  const sceneControlsAllowed =
    !interactionPaused;

  const getAutoOrbitCameraAtAngle =
    useCallback(
      (
        angle: number,
      ): VectorTuple => {
        const baseCamera =
          compact
            ? INTRO_STREET_CAMERA_MOBILE
            : INTRO_STREET_CAMERA_DESKTOP;

        const targetX =
          INTRO_STREET_TARGET[0];

        const targetZ =
          INTRO_STREET_TARGET[2];

        const horizontalRadius =
          Math.hypot(
            baseCamera[0] -
              targetX,

            baseCamera[2] -
              targetZ,
          );

        return [
          targetX +
            Math.sin(
              angle,
            ) *
              horizontalRadius,

          baseCamera[1],

          targetZ +
            Math.cos(
              angle,
            ) *
              horizontalRadius,
        ] as const;
      },
      [
        compact,
      ],
    );

  const stopIdleRotation =
    useCallback(() => {
      automaticRotationWantedRef.current =
        false;

      visitorInteractedRef.current =
        true;

      setIdleRotationEnabled(
        false,
      );
    }, []);

  /*
   * Normal canvas interaction.
   *
   * While a modal is fully released,
   * down-scroll continues the same
   * forward rotation direction.
   *
   * Up-scroll belongs to the modal
   * restoration and must never rotate
   * the building backwards.
   */
  useEffect(() => {
    const canvas =
      gl.domElement;

    const handlePointerDown = (
      event: PointerEvent,
    ) => {
      if (
        moving ||
        !sceneControlsAllowed ||
        focusedSectionId !==
          null
      ) {
        return;
      }

      pointerDownRef.current =
        true;

      activePointerIdRef.current =
        event.pointerId;

      pointerStartRef.current = {
        x: event.clientX,
        y: event.clientY,
      };
    };

    const handlePointerMove = (
      event: PointerEvent,
    ) => {
      if (
        !pointerDownRef.current ||
        activePointerIdRef.current !==
          event.pointerId
      ) {
        return;
      }

      const horizontalTravel =
        event.clientX -
        pointerStartRef.current.x;

      const verticalTravel =
        event.clientY -
        pointerStartRef.current.y;

      const travelDistance =
        Math.hypot(
          horizontalTravel,
          verticalTravel,
        );

      if (
        travelDistance <
        MANUAL_DRAG_THRESHOLD
      ) {
        return;
      }

      pointerDownRef.current =
        false;

      activePointerIdRef.current =
        null;

      stopIdleRotation();
    };

    const handlePointerEnd = (
      event: PointerEvent,
    ) => {
      if (
        activePointerIdRef.current !==
        event.pointerId
      ) {
        return;
      }

      pointerDownRef.current =
        false;

      activePointerIdRef.current =
        null;
    };

    const handleWheel = (
      event: WheelEvent,
    ) => {
      if (
        moving ||
        !sceneControlsAllowed ||
        focusedSectionId !==
          null
      ) {
        return;
      }

      const controls =
        controlsRef.current;

      if (!controls) {
        return;
      }

      const deltaMultiplier =
        event.deltaMode === 1
          ? 16
          : event.deltaMode === 2
            ? window.innerHeight
            : 1;

      const dominantDelta =
        Math.abs(
          event.deltaY,
        ) >=
        Math.abs(
          event.deltaX,
        )
          ? event.deltaY
          : event.deltaX;

      const normalizedDelta =
        dominantDelta *
        deltaMultiplier;

      /*
       * Up-scroll must be reserved for
       * restoring the hidden modal.
       *
       * useModalHomeReveal normally
       * catches this first, but this is
       * an extra safety guard.
       */
      if (
        modalRevealReleased &&
        normalizedDelta < 0
      ) {
        event.preventDefault();

        return;
      }

      event.preventDefault();

      /*
       * Normal homepage:
       * wheel interaction stops
       * automatic rotation.
       *
       * Reversible-modal homepage:
       * keep the automatic motion alive.
       */
      if (
        !modalRevealReleased
      ) {
        stopIdleRotation();
      }

      /*
       * Positive OrbitControls autoRotate
       * moves by reducing azimuth.
       *
       * Force downward wheel input into
       * that same direction.
       */
      const directionalDelta =
        modalRevealReleased
          ? -Math.abs(
              normalizedDelta,
            )
          : normalizedDelta;

      const rotationAmount =
        Math.max(
          -MAX_WHEEL_ROTATION_STEP,

          Math.min(
            MAX_WHEEL_ROTATION_STEP,

            directionalDelta *
              WHEEL_ROTATION_SENSITIVITY,
          ),
        );

      const cameraOffset =
        camera.position
          .clone()
          .sub(
            controls.target,
          );

      cameraOffset.applyAxisAngle(
        WORLD_UP,
        rotationAmount,
      );

      camera.position
        .copy(
          controls.target,
        )
        .add(
          cameraOffset,
        );

      controls.update();
    };

    canvas.addEventListener(
      "pointerdown",
      handlePointerDown,
      {
        passive: true,
      },
    );

    window.addEventListener(
      "pointermove",
      handlePointerMove,
      {
        passive: true,
      },
    );

    window.addEventListener(
      "pointerup",
      handlePointerEnd,
      {
        passive: true,
      },
    );

    window.addEventListener(
      "pointercancel",
      handlePointerEnd,
      {
        passive: true,
      },
    );

    canvas.addEventListener(
      "wheel",
      handleWheel,
      {
        passive: false,
      },
    );

    return () => {
      canvas.removeEventListener(
        "pointerdown",
        handlePointerDown,
      );

      window.removeEventListener(
        "pointermove",
        handlePointerMove,
      );

      window.removeEventListener(
        "pointerup",
        handlePointerEnd,
      );

      window.removeEventListener(
        "pointercancel",
        handlePointerEnd,
      );

      canvas.removeEventListener(
        "wheel",
        handleWheel,
      );
    };
  }, [
    camera,
    focusedSectionId,
    gl,
    modalRevealReleased,
    moving,
    sceneControlsAllowed,
    stopIdleRotation,
  ]);

  const handleControlsReady =
    useCallback(
      (
        controls:
          any | null,
      ) => {
        controlsRef.current =
          controls;

        if (
          !controls ||
          readyRef.current
        ) {
          return;
        }

        readyRef.current =
          true;

        camera.position.set(
          ...homeCamera,
        );

        controls.target.set(
          ...HOME_TARGET,
        );

        controls.update();

        readyFrameOneRef.current =
          window.requestAnimationFrame(
            () => {
              readyFrameTwoRef.current =
                window.requestAnimationFrame(
                  () => {
                    onSceneReady?.();
                  },
                );
            },
          );
      },
      [
        camera,
        homeCamera,
        onSceneReady,
      ],
    );

  useEffect(() => {
    return () => {
      if (
        readyFrameOneRef.current !==
        null
      ) {
        window.cancelAnimationFrame(
          readyFrameOneRef.current,
        );
      }

      if (
        readyFrameTwoRef.current !==
        null
      ) {
        window.cancelAnimationFrame(
          readyFrameTwoRef.current,
        );
      }
    };
  }, []);

  const handleLightDebugClick = (
    event:
      ThreeEvent<MouseEvent>,
  ) => {
    if (
      !ENABLE_LIGHT_DEBUGGER
    ) {
      return;
    }

    event.stopPropagation();

    const clickedPosition:
      VectorTuple = [
        Number(
          event.point.x.toFixed(
            3,
          ),
        ),

        Number(
          event.point.y.toFixed(
            3,
          ),
        ),

        Number(
          event.point.z.toFixed(
            3,
          ),
        ),
      ];

    setDebugClickPoint(
      clickedPosition,
    );

    const nearbyLights: Array<{
      name: string;
      type: string;
      distance: number;
      position: string;
    }> = [];

    scene.traverse(
      (
        object,
      ) => {
        const possibleLight =
          object as typeof object & {
            isLight?: boolean;
          };

        if (
          !possibleLight.isLight
        ) {
          return;
        }

        const lightPosition =
          new Vector3();

        possibleLight.getWorldPosition(
          lightPosition,
        );

        nearbyLights.push({
          name:
            possibleLight.name ||
            "(unnamed light)",

          type:
            possibleLight.type,

          distance:
            Number(
              lightPosition
                .distanceTo(
                  event.point,
                )
                .toFixed(
                  3,
                ),
            ),

          position:
            `[${lightPosition.x.toFixed(
              3,
            )}, ${lightPosition.y.toFixed(
              3,
            )}, ${lightPosition.z.toFixed(
              3,
            )}]`,
        });
      },
    );

    nearbyLights.sort(
      (
        first,
        second,
      ) =>
        first.distance -
        second.distance,
    );

    console.group(
      "LIGHT POSITION DEBUG",
    );

    console.log(
      "Clicked position:",
      clickedPosition,
    );

    console.table(
      nearbyLights.slice(
        0,
        20,
      ),
    );

    console.groupEnd();
  };

  const lockCamera =
    useCallback(
      (
        nextCamera:
          VectorTuple,

        nextTarget:
          VectorTuple,
      ) => {
        const controls =
          controlsRef.current;

        if (!controls) {
          return;
        }

        camera.position.set(
          ...nextCamera,
        );

        controls.target.set(
          ...nextTarget,
        );

        controls.update();
      },
      [
        camera,
      ],
    );

  const stopCameraTweens =
    useCallback(() => {
      cameraTimelineRef.current
        ?.kill();

      cameraTimelineRef.current =
        null;

      gsap.killTweensOf(
        camera.position,
      );

      const controls =
        controlsRef.current;

      if (controls) {
        gsap.killTweensOf(
          controls.target,
        );

        controls.update();
      }
    }, [
      camera,
    ]);

  useEffect(() => {
    const perspectiveCamera =
      camera as PerspectiveCamera;

    perspectiveCamera.fov =
      compact
        ? 43
        : 36;

    perspectiveCamera
      .updateProjectionMatrix();
  }, [
    camera,
    compact,
  ]);

  const moveCamera =
    useCallback(
      (
        nextCamera:
          VectorTuple,

        nextTarget:
          VectorTuple,

        duration = 1.35,

        afterMove?: () => void,
      ) => {
        const controls =
          controlsRef.current;

        if (!controls) {
          return;
        }

        stopCameraTweens();

        setMoving(
          true,
        );

        const timeline =
          gsap.timeline({
            onUpdate: () => {
              controls.update();
            },

            onComplete: () => {
              lockCamera(
                nextCamera,
                nextTarget,
              );

              cameraTimelineRef.current =
                null;

              setMoving(
                false,
              );

              afterMove?.();
            },

            onInterrupt: () => {
              cameraTimelineRef.current =
                null;

              setMoving(
                false,
              );
            },
          });

        cameraTimelineRef.current =
          timeline;

        timeline.to(
          camera.position,
          {
            x:
              nextCamera[0],

            y:
              nextCamera[1],

            z:
              nextCamera[2],

            duration,

            ease:
              "power3.inOut",
          },
          0,
        );

        timeline.to(
          controls.target,
          {
            x:
              nextTarget[0],

            y:
              nextTarget[1],

            z:
              nextTarget[2],

            duration,

            ease:
              "power3.inOut",
          },
          0,
        );
      },
      [
        camera,
        lockCamera,
        stopCameraTweens,
      ],
    );

  /*
   * Enter the normal homepage orbit
   * after a modal has fully lifted.
   *
   * IMPORTANT:
   *
   * This does NOT clear activeId.
   *
   * AutomaticHotspotController is
   * already running again by this point.
   * Clearing activeId here caused the
   * empty purple popup-card shell.
   */
  const enterModalRevealHome =
    useCallback(() => {
      const controls =
        controlsRef.current;

      if (!controls) {
        return;
      }

      stopCameraTweens();

      automaticRotationWantedRef.current =
        false;

      setIdleRotationEnabled(
        false,
      );

      const orbitTarget =
        new Vector3(
          INTRO_STREET_TARGET[0],
          INTRO_STREET_TARGET[1],
          INTRO_STREET_TARGET[2],
        );

      const currentOffset =
        camera.position
          .clone()
          .sub(
            orbitTarget,
          );

      const baseCamera =
        compact
          ? INTRO_STREET_CAMERA_MOBILE
          : INTRO_STREET_CAMERA_DESKTOP;

      const startingAngle =
        Math.atan2(
          currentOffset.x,
          currentOffset.z,
        );

      const startingRadius =
        Math.max(
          0.001,

          Math.hypot(
            currentOffset.x,
            currentOffset.z,
          ),
        );

      const finalRadius =
        Math.hypot(
          baseCamera[0] -
            orbitTarget.x,

          baseCamera[2] -
            orbitTarget.z,
        );

      /*
       * autoRotateSpeed > 0 reduces
       * OrbitControls' azimuth angle.
       *
       * Subtracting keeps this transition
       * traveling in that same direction.
       */
      const finalAngle =
        startingAngle -
        MODAL_REVEAL_FORWARD_ANGLE;

      const orbitState = {
        angle:
          startingAngle,

        radius:
          startingRadius,

        height:
          camera.position.y,

        targetX:
          controls.target.x,

        targetY:
          controls.target.y,

        targetZ:
          controls.target.z,
      };

      pointerDownRef.current =
        false;

      activePointerIdRef.current =
        null;

      setMoving(
        true,
      );

      window.dispatchEvent(
        new CustomEvent(
          FOCUS_STATE_EVENT,
          {
            detail: {
              focused:
                focusedSectionId !==
                null,

              returning: true,
            },
          },
        ),
      );

      const applyOrbit =
        () => {
          camera.position.set(
            orbitTarget.x +
              Math.sin(
                orbitState.angle,
              ) *
                orbitState.radius,

            orbitState.height,

            orbitTarget.z +
              Math.cos(
                orbitState.angle,
              ) *
                orbitState.radius,
          );

          controls.target.set(
            orbitState.targetX,
            orbitState.targetY,
            orbitState.targetZ,
          );

          controls.update();
        };

      const timeline =
        gsap.timeline({
          onUpdate:
            applyOrbit,

          onComplete: () => {
            cameraTimelineRef.current =
              null;

            setMoving(
              false,
            );

            setFocusedSectionId(
              null,
            );

            /*
             * DO NOT:
             *
             * onActiveChange(null)
             *
             * Keeping activeId intact prevents
             * AutoCardStack from becoming an
             * empty purple shell immediately
             * after the modal reveal.
             *
             * AutomaticHotspotController will
             * update activeId naturally when
             * another hotspot becomes active.
             */

            automaticRotationWantedRef.current =
              true;

            visitorInteractedRef.current =
              false;

            setIdleRotationEnabled(
              true,
            );

            returnOrbitAngleRef.current =
              null;

            pointerDownRef.current =
              false;

            activePointerIdRef.current =
              null;

            window.dispatchEvent(
              new CustomEvent(
                FOCUS_STATE_EVENT,
                {
                  detail: {
                    focused:
                      false,

                    returning:
                      false,
                  },
                },
              ),
            );
          },

          onInterrupt: () => {
            cameraTimelineRef.current =
              null;

            setMoving(
              false,
            );
          },
        });

      cameraTimelineRef.current =
        timeline;

      timeline.to(
        orbitState,
        {
          angle:
            finalAngle,

          radius:
            finalRadius,

          height:
            baseCamera[1],

          targetX:
            INTRO_STREET_TARGET[0],

          targetY:
            INTRO_STREET_TARGET[1],

          targetZ:
            INTRO_STREET_TARGET[2],

          duration:
            0.9,

          ease:
            "power2.inOut",
        },
        0,
      );
    }, [
      camera,
      compact,
      focusedSectionId,
      stopCameraTweens,
    ]);

  /*
   * Reversible modal state.
   */
  useEffect(() => {
    const handleModalRevealState = (
      event: Event,
    ) => {
      const customEvent =
        event as CustomEvent<{
          released?: boolean;
          progress?: number;
        }>;

      const released =
        Boolean(
          customEvent.detail
            ?.released,
        );

      setModalRevealReleased(
        released,
      );

      if (released) {
        /*
         * Modal is completely above
         * the viewport.
         *
         * Join the normal home orbit.
         */
        enterModalRevealHome();

        return;
      }

      /*
       * User is scrolling upward and
       * restoring the previous modal.
       */
      stopCameraTweens();

      automaticRotationWantedRef.current =
        false;

      setIdleRotationEnabled(
        false,
      );

      pointerDownRef.current =
        false;

      activePointerIdRef.current =
        null;
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
  }, [
    enterModalRevealHome,
    stopCameraTweens,
  ]);

  const moveToAboutDoor =
    useCallback(
      (
        section:
          PortfolioSection,
      ) => {
        const nextCamera =
          compact
            ? ABOUT_CAMERA_MOBILE
            : section.camera;

        moveCamera(
          nextCamera,
          section.focus,
          1.65,
        );
      },
      [
        compact,
        moveCamera,
      ],
    );

  const moveToProjectsStorefront =
    useCallback(
      (
        section:
          PortfolioSection,
      ) => {
        const nextCamera =
          compact
            ? PROJECTS_CAMERA_MOBILE
            : section.camera;

        moveCamera(
          nextCamera,
          section.focus,
          1.55,
        );
      },
      [
        compact,
        moveCamera,
      ],
    );

  const moveToCreditsRooftop =
    useCallback(
      (
        section:
          PortfolioSection,
      ) => {
        const nextCamera =
          compact
            ? CREDITS_CAMERA_MOBILE
            : section.camera;

        moveCamera(
          nextCamera,
          section.focus,
          1.35,
        );
      },
      [
        compact,
        moveCamera,
      ],
    );

  const selectSection =
    useCallback(
      (
        section:
          PortfolioSection,
      ) => {
        if (
          moving ||
          !sceneControlsAllowed ||
          focusedSectionId !==
            null
        ) {
          return;
        }

        let selectedSectionCamera:
          VectorTuple =
            section.camera;

        if (compact) {
          if (
            section.id ===
            "about"
          ) {
            selectedSectionCamera =
              ABOUT_CAMERA_MOBILE;
          } else if (
            section.id ===
            "projects"
          ) {
            selectedSectionCamera =
              PROJECTS_CAMERA_MOBILE;
          } else if (
            section.id ===
            "credits"
          ) {
            selectedSectionCamera =
              CREDITS_CAMERA_MOBILE;
          }
        }

        returnOrbitAngleRef.current =
          Math.atan2(
            selectedSectionCamera[0] -
              INTRO_STREET_TARGET[0],

            selectedSectionCamera[2] -
              INTRO_STREET_TARGET[2],
          );

        setFocusedSectionId(
          section.id,
        );

        window.dispatchEvent(
          new CustomEvent(
            FOCUS_STATE_EVENT,
            {
              detail: {
                focused: true,
                returning: false,
              },
            },
          ),
        );

        window.dispatchEvent(
          new CustomEvent(
            MANUAL_HOTSPOT_EVENT,
            {
              detail: {
                id:
                  section.id,
              },
            },
          ),
        );

        onActiveChange(
          section.id,
        );

        if (
          section.id ===
          "about"
        ) {
          moveToAboutDoor(
            section,
          );

          return;
        }

        if (
          section.id ===
          "projects"
        ) {
          moveToProjectsStorefront(
            section,
          );

          return;
        }

        if (
          section.id ===
          "credits"
        ) {
          moveToCreditsRooftop(
            section,
          );

          return;
        }

        moveCamera(
          section.camera,
          section.focus,
        );
      },
      [
        compact,
        focusedSectionId,
        moveCamera,
        moveToAboutDoor,
        moveToCreditsRooftop,
        moveToProjectsStorefront,
        moving,
        onActiveChange,
        sceneControlsAllowed,
      ],
    );

  /*
   * Normal explicit Home-button return.
   *
   * Unlike the modal scroll reveal,
   * this DOES intentionally clear activeId.
   */
  const returnToHome =
    useCallback(() => {
      const baseCamera =
        compact
          ? INTRO_STREET_CAMERA_MOBILE
          : INTRO_STREET_CAMERA_DESKTOP;

      const fallbackAngle =
        Math.atan2(
          baseCamera[0] -
            INTRO_STREET_TARGET[0],

          baseCamera[2] -
            INTRO_STREET_TARGET[2],
        );

      const currentAngle =
        Math.atan2(
          camera.position.x -
            INTRO_STREET_TARGET[0],

          camera.position.z -
            INTRO_STREET_TARGET[2],
        );

      const returnAngle =
        focusedSectionId !==
        null
          ? returnOrbitAngleRef.current ??
            fallbackAngle
          : currentAngle;

      const returnCamera =
        getAutoOrbitCameraAtAngle(
          returnAngle,
        );

      window.dispatchEvent(
        new CustomEvent(
          FOCUS_STATE_EVENT,
          {
            detail: {
              focused:
                focusedSectionId !==
                null,

              returning: true,
            },
          },
        ),
      );

      moveCamera(
        returnCamera,
        INTRO_STREET_TARGET,
        focusedSectionId !==
        null
          ? 1.15
          : 0.75,
        () => {
          setFocusedSectionId(
            null,
          );

          onActiveChange(
            null,
          );

          automaticRotationWantedRef.current =
            true;

          visitorInteractedRef.current =
            false;

          setIdleRotationEnabled(
            true,
          );

          returnOrbitAngleRef.current =
            null;

          pointerDownRef.current =
            false;

          activePointerIdRef.current =
            null;

          window.dispatchEvent(
            new CustomEvent(
              FOCUS_STATE_EVENT,
              {
                detail: {
                  focused:
                    false,

                  returning:
                    false,
                },
              },
            ),
          );
        },
      );
    }, [
      camera,
      compact,
      focusedSectionId,
      getAutoOrbitCameraAtAngle,
      moveCamera,
      onActiveChange,
    ]);

  useEffect(() => {
    const handleReturnHome =
      () => {
        returnToHome();
      };

    window.addEventListener(
      RETURN_HOME_EVENT,
      handleReturnHome,
    );

    return () => {
      window.removeEventListener(
        RETURN_HOME_EVENT,
        handleReturnHome,
      );
    };
  }, [
    returnToHome,
  ]);

  useEffect(() => {
    const handleSelection = (
      event: Event,
    ) => {
      const customEvent =
        event as CustomEvent<{
          id?: SectionId;
        }>;

      const requestedId =
        customEvent.detail?.id;

      const section =
        SECTIONS.find(
          (
            item,
          ) =>
            item.id ===
            requestedId,
        );

      if (section) {
        selectSection(
          section,
        );
      }
    };

    window.addEventListener(
      SELECT_SECTION_EVENT,
      handleSelection,
    );

    return () => {
      window.removeEventListener(
        SELECT_SECTION_EVENT,
        handleSelection,
      );
    };
  }, [
    selectSection,
  ]);

  useEffect(() => {
    const handleIntro = () => {
      const controls =
        controlsRef.current;

      if (!controls) {
        return;
      }

      const startCamera =
        compact
          ? INTRO_CAMERA_MOBILE
          : INTRO_CAMERA_DESKTOP;

      const finalCamera =
        compact
          ? INTRO_STREET_CAMERA_MOBILE
          : INTRO_STREET_CAMERA_DESKTOP;

      stopCameraTweens();

      setModalRevealReleased(
        false,
      );

      visitorInteractedRef.current =
        false;

      automaticRotationWantedRef.current =
        true;

      returnOrbitAngleRef.current =
        null;

      pointerDownRef.current =
        false;

      activePointerIdRef.current =
        null;

      setMoving(
        true,
      );

      setFocusedSectionId(
        null,
      );

      onActiveChange(
        null,
      );

      setIdleRotationEnabled(
        false,
      );

      window.dispatchEvent(
        new CustomEvent(
          FOCUS_STATE_EVENT,
          {
            detail: {
              focused: false,
              returning: false,
            },
          },
        ),
      );

      const orbitTarget =
        new Vector3(
          INTRO_STREET_TARGET[0],
          INTRO_STREET_TARGET[1],
          INTRO_STREET_TARGET[2],
        );

      const startOffset =
        new Vector3(
          startCamera[0],
          startCamera[1],
          startCamera[2],
        ).sub(
          orbitTarget,
        );

      const finalOffset =
        new Vector3(
          finalCamera[0],
          finalCamera[1],
          finalCamera[2],
        ).sub(
          orbitTarget,
        );

      const orbitState = {
        angle:
          Math.atan2(
            startOffset.x,
            startOffset.z,
          ),

        horizontalRadius:
          Math.hypot(
            startOffset.x,
            startOffset.z,
          ),

        height:
          startCamera[1],
      };

      let finalAngle =
        Math.atan2(
          finalOffset.x,
          finalOffset.z,
        );

      while (
        finalAngle <=
        orbitState.angle
      ) {
        finalAngle +=
          Math.PI * 2;
      }

      const finalHorizontalRadius =
        Math.hypot(
          finalOffset.x,
          finalOffset.z,
        );

      const finishingRotation =
        (Math.PI * 11) /
        180;

      const mainRotationEnd =
        finalAngle -
        finishingRotation;

      const applyCameraPosition =
        () => {
          camera.position.set(
            orbitTarget.x +
              Math.sin(
                orbitState.angle,
              ) *
                orbitState.horizontalRadius,

            orbitState.height,

            orbitTarget.z +
              Math.cos(
                orbitState.angle,
              ) *
                orbitState.horizontalRadius,
          );

          controls.target.copy(
            orbitTarget,
          );

          controls.update();
        };

      lockCamera(
        startCamera,
        INTRO_STREET_TARGET,
      );

      const timeline =
        gsap.timeline({
          onComplete: () => {
            lockCamera(
              finalCamera,
              INTRO_STREET_TARGET,
            );

            cameraTimelineRef.current =
              null;

            setMoving(
              false,
            );

            automaticRotationWantedRef.current =
              true;

            visitorInteractedRef.current =
              false;

            setIdleRotationEnabled(
              true,
            );
          },

          onInterrupt: () => {
            cameraTimelineRef.current =
              null;

            setMoving(
              false,
            );
          },
        });

      cameraTimelineRef.current =
        timeline;

      timeline.to(
        orbitState,
        {
          angle:
            mainRotationEnd,

          horizontalRadius:
            finalHorizontalRadius *
            0.98,

          height:
            finalCamera[1] +
            0.65,

          duration:
            INTRO_ZOOM_DURATION *
            0.76,

          ease:
            "power1.inOut",

          onUpdate:
            applyCameraPosition,
        },
        0,
      );

      timeline.to(
        orbitState,
        {
          angle:
            finalAngle,

          horizontalRadius:
            finalHorizontalRadius,

          height:
            finalCamera[1],

          duration:
            INTRO_ZOOM_DURATION *
            0.24,

          ease:
            "power1.out",

          onUpdate:
            applyCameraPosition,
        },
      );
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

      stopCameraTweens();
    };
  }, [
    camera,
    compact,
    lockCamera,
    onActiveChange,
    stopCameraTweens,
  ]);

  return (
    <>
      <color
        attach="background"
        args={[
          "#000000",
        ]}
      />

      <fog
        attach="fog"
        args={[
          "#000000",
          30,
          74,
        ]}
      />

      <ambientLight
        intensity={
          0.12
        }
      />

      <spotLight
        position={[
          9,
          17,
          11,
        ]}
        angle={
          0.52
        }
        penumbra={
          0.86
        }
        intensity={
          4.15
        }
        color="#ffd0b6"
        distance={
          48
        }
        decay={
          1.45
        }
        castShadow
        shadow-mapSize-width={
          1024
        }
        shadow-mapSize-height={
          1024
        }
      />

      <spotLight
        position={[
          -11,
          14,
          -10,
        ]}
        angle={
          0.68
        }
        penumbra={
          0.92
        }
        intensity={
          2.75
        }
        color="#727cff"
        distance={
          52
        }
        decay={
          1.55
        }
      />

      <pointLight
        position={[
          2.5,
          8.2,
          1.7,
        ]}
        intensity={
          1.7
        }
        color="#ff7665"
        distance={
          20
        }
        decay={
          1.5
        }
      />

      <ConcreteRooftopGround />

      <GroundGraffiti />

      <ExistingStreetSignOverlay />

      <SakuraAtmosphere />

      <FloatingHeart
        position={[
          0,
          13.25,
          0,
        ]}
        scale={
          0.68
        }
      />

      <group
        onClick={
          handleLightDebugClick
        }
      >
        <MysteriousAdventureModel />
      </group>

      <RooftopVideoAdvertisement />

      <SquareWallVideoAdvertisement />

      {ENABLE_LIGHT_DEBUGGER &&
        debugClickPoint && (
          <mesh
            position={
              debugClickPoint
            }
            renderOrder={
              999
            }
          >
            <sphereGeometry
              args={[
                0.11,
                18,
                18,
              ]}
            />

            <meshBasicMaterial
              color="#00ffff"
              toneMapped={
                false
              }
              depthTest={
                false
              }
              depthWrite={
                false
              }
            />
          </mesh>
        )}

      <TokyoStreetLampGlow />

      <TrainStreetLampGlow />

      <pointLight
        position={[
          10,
          12,
          4,
        ]}
        intensity={
          5
        }
        distance={
          28
        }
        decay={
          1.6
        }
        color="#ffc87a"
      />

      <pointLight
        position={[
          10,
          7,
          5,
        ]}
        intensity={
          6
        }
        distance={
          24
        }
        decay={
          1.65
        }
        color="#ffbe72"
      />

      <pointLight
        position={[
          9,
          3.5,
          6,
        ]}
        intensity={
          7
        }
        distance={
          22
        }
        decay={
          1.6
        }
        color="#ffba68"
      />

      <pointLight
        position={[
          8,
          0.8,
          8,
        ]}
        intensity={
          7
        }
        distance={
          20
        }
        decay={
          1.55
        }
        color="#ffb660"
      />

      <pointLight
        position={[
          7,
          0.5,
          3,
        ]}
        intensity={
          3.4
        }
        distance={
          13
        }
        decay={
          1.85
        }
        color="#ffc070"
      />

      <pointLight
        position={[
          5,
          2.5,
          1,
        ]}
        intensity={
          2.8
        }
        distance={
          12
        }
        decay={
          1.9
        }
        color="#ffbe74"
      />

      <pointLight
        position={[
          9,
          0.1,
          6,
        ]}
        intensity={
          4.2
        }
        distance={
          15
        }
        decay={
          1.8
        }
        color="#ffb258"
      />

      <BackAlleyPinkGlow />

      {SECTIONS.map(
        (
          section,
        ) => (
          <NumberHotspot
            key={
              section.id
            }
            section={
              section
            }
            disabled={
              moving ||
              !sceneControlsAllowed ||
              focusedSectionId !==
                null
            }
            selected={
              activeId ===
              section.id
            }
            showCard={
              idleRotationEnabled &&
              activeId ===
                section.id &&
              !moving &&
              sceneControlsAllowed &&
              focusedSectionId ===
                null
            }
            onSelect={
              selectSection
            }
            onClose={() => {
              /*
               * Cards are controlled
               * by camera traversal.
               */
            }}
            onProjectSelect={
              onProjectSelect
            }
            onOpenSectionDetail={
              onOpenSectionDetail
            }
          />
        ),
      )}

      <EffectComposer
        multisampling={
          0
        }
        enableNormalPass
      >
        <SSAO
          blendFunction={
            BlendFunction.MULTIPLY
          }
          samples={
            12
          }
          rings={
            4
          }
          radius={
            0.075
          }
          intensity={
            1.2
          }
          luminanceInfluence={
            0.52
          }
          resolutionScale={
            0.65
          }
        />

        <Bloom
          mipmapBlur
          intensity={
            0.5
          }
          luminanceThreshold={
            0.68
          }
          luminanceSmoothing={
            0.2
          }
        />

        <Vignette
          eskil={
            false
          }
          offset={
            0.18
          }
          darkness={
            0.72
          }
        />
      </EffectComposer>

      <OrbitControls
        ref={
          handleControlsReady
        }

        makeDefault

        autoRotate={
          idleRotationEnabled &&
          !moving &&
          focusedSectionId ===
            null &&
          sceneControlsAllowed
        }

        autoRotateSpeed={
          2.8
        }

        enabled={
          !moving &&
          focusedSectionId ===
            null &&
          sceneControlsAllowed
        }

        enablePan={
          false
        }

        enableRotate

        enableZoom={
          false
        }

        mouseButtons={{
          LEFT:
            MOUSE.ROTATE,

          MIDDLE:
            MOUSE.ROTATE,

          RIGHT:
            MOUSE.PAN,
        }}

        touches={{
          ONE:
            TOUCH.ROTATE,

          TWO:
            TOUCH.DOLLY_ROTATE,
        }}

        minPolarAngle={
          Math.PI / 7
        }

        maxPolarAngle={
          Math.PI /
          2.02
        }

        rotateSpeed={
          compact
            ? 0.68
            : 0.82
        }

        enableDamping={
          !moving &&
          focusedSectionId ===
            null &&
          sceneControlsAllowed
        }

        dampingFactor={
          0.075
        }
      />
    </>
  );
}