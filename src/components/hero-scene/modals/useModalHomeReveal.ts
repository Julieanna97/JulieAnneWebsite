"use client";

import {
  useEffect,
  useRef,
  type RefObject,
} from "react";

type UseModalHomeRevealOptions = {
  active: boolean;

  scrollRef:
    RefObject<HTMLElement | null>;

  revealRef:
    RefObject<HTMLElement | null>;

  liftRef:
    RefObject<HTMLElement | null>;

  releaseRef?:
    RefObject<HTMLElement | null>;

  /*
   * Kept for compatibility with your
   * existing modal calls.
   *
   * IMPORTANT:
   * A reversible reveal must NOT call
   * this automatically at the bottom,
   * otherwise React unmounts the modal
   * and there is nothing to restore.
   */
  onComplete?: () => void;
};

const REVEAL_SHIFT_VARIABLE =
  "--adventure-modal-native-scroll-shift";

const REVEAL_ACTIVE_ATTRIBUTE =
  "data-home-reveal-active";

const MODAL_REVEAL_STATE_EVENT =
  "adventure:modal-reveal-state";

const RESTORE_RELEASED_MODAL_EVENT =
  "adventure:restore-released-modal";

/*
 * Keep the release decision tied to the actual native scroll position.
 * A tiny pixel tolerance avoids sub-pixel rounding without creating a
 * visible "home is shown but still locked" dead zone.
 */
const RELEASE_EPSILON_PX = 2;

const clamp01 = (
  value: number,
) => {
  return Math.min(
    1,
    Math.max(
      0,
      value,
    ),
  );
};

export default function useModalHomeReveal({
  active,
  scrollRef,
  revealRef,
  liftRef,
  releaseRef,
}: UseModalHomeRevealOptions) {
  const frameRef =
    useRef<number | null>(
      null,
    );

  const fullyRevealedRef =
    useRef(false);

  const revealActiveRef =
    useRef(false);

  const previousTouchYRef =
    useRef<number | null>(
      null,
    );

  const lastReleasedStateRef =
    useRef(false);

  useEffect(() => {
    if (!active) {
      fullyRevealedRef.current =
        false;

      revealActiveRef.current =
        false;

      lastReleasedStateRef.current =
        false;

      return;
    }

    const scrollElement =
      scrollRef.current;

    const revealElement =
      revealRef.current;

    const liftElement =
      liftRef.current;

    const releaseElement =
      releaseRef?.current ??
      null;

    if (
      !scrollElement ||
      !revealElement ||
      !liftElement
    ) {
      return;
    }

    fullyRevealedRef.current =
      false;

    revealActiveRef.current =
      false;

    lastReleasedStateRef.current =
      false;

    previousTouchYRef.current =
      null;

    liftElement.style.transform =
      "translate3d(0, 0, 0)";

    liftElement.style.willChange =
      "transform";

    liftElement.style.setProperty(
      REVEAL_SHIFT_VARIABLE,
      "0px",
    );

    if (releaseElement) {
      releaseElement.style.pointerEvents =
        "";

      releaseElement.style.visibility =
        "";

      releaseElement.inert =
        false;

      releaseElement.removeAttribute(
        "aria-hidden",
      );
    }

    scrollElement.removeAttribute(
      REVEAL_ACTIVE_ATTRIBUTE,
    );

    const dispatchRevealState = (
      released: boolean,
      progress: number,
    ) => {
      /*
       * Only send the important state
       * transition once.
       *
       * We don't need to dispatch an
       * event on every scroll pixel.
       */
      if (
        lastReleasedStateRef.current ===
        released
      ) {
        return;
      }

      lastReleasedStateRef.current =
        released;

      window.dispatchEvent(
        new CustomEvent(
          MODAL_REVEAL_STATE_EVENT,
          {
            detail: {
              released,
              progress,
            },
          },
        ),
      );
    };

    const getMeasurements =
      () => {
        const viewportHeight =
          Math.max(
            scrollElement.clientHeight,
            1,
          );

        const maxScroll =
          Math.max(
            0,

            scrollElement.scrollHeight -
              scrollElement.clientHeight,
          );

        const revealHeight =
          Math.max(
            viewportHeight,
            revealElement.offsetHeight,
          );

        const revealDistance =
          Math.max(
            1,

            Math.min(
              revealHeight,

              Math.max(
                maxScroll,
                1,
              ),
            ),
          );

        const revealStart =
          Math.max(
            0,

            maxScroll -
              revealDistance,
          );

        return {
          viewportHeight,
          maxScroll,
          revealDistance,
          revealStart,
        };
      };

    const update = () => {
      frameRef.current =
        null;

      const {
        maxScroll,
        revealDistance,
        revealStart,
      } =
        getMeasurements();

      if (
        maxScroll <= 0
      ) {
        return;
      }

      const nativeRevealScroll =
        Math.min(
          revealDistance,

          Math.max(
            0,

            scrollElement.scrollTop -
              revealStart,
          ),
        );

      const progress =
        clamp01(
          nativeRevealScroll /
            revealDistance,
        );

      const remainingReveal =
        Math.max(
          0,
          revealDistance -
            nativeRevealScroll,
        );

      const fullyRevealed =
        remainingReveal <=
        RELEASE_EPSILON_PX;

      fullyRevealedRef.current =
        fullyRevealed;

      revealActiveRef.current =
        progress > 0;

      /*
       * IMPORTANT:
       *
       * Do NOT translate the entire modal
       * scroll container here.
       *
       * The native scroll already moves the
       * opaque modal content upward while the
       * transparent reveal track enters the
       * viewport. Applying a second -Y
       * transform to the whole lift layer makes
       * the Three.js homepage LOOK fully visible
       * before scrollTop has actually reached the
       * release point.
       *
       * In that visual/logical gap the fixed
       * backdrop is still above the canvas,
       * HeroScene still has interactionPaused
       * enabled, and the user sees exactly the
       * dead state this hook is meant to avoid:
       * visible 3D scene, but no drag/click/nav.
       */
      liftElement.style.transform =
        "translate3d(0, 0, 0)";

      /*
       * Keep your pink jump button glued
       * to the moving modal background.
       */
      liftElement.style.setProperty(
        REVEAL_SHIFT_VARIABLE,
        `${nativeRevealScroll}px`,
      );

      /*
       * Hide the modal scrollbar while
       * any of the 3D homepage is exposed.
       */
      if (
        progress > 0
      ) {
        scrollElement.setAttribute(
          REVEAL_ACTIVE_ATTRIBUTE,
          "true",
        );
      } else {
        scrollElement.removeAttribute(
          REVEAL_ACTIVE_ATTRIBUTE,
        );
      }

      if (
        fullyRevealed
      ) {
        /*
         * The retained backdrop must not
         * participate in hit-testing once
         * the native reveal scroll is truly
         * at its end.
         *
         * We keep it mounted (so reverse
         * scrolling can restore the same
         * modal), but make the whole retained
         * layer invisible and inert.
         */
        if (
          releaseElement
        ) {
          releaseElement.style.pointerEvents =
            "none";

          /*
           * pointer-events:none alone is not
           * strong enough for a retained modal:
           * descendants can explicitly opt back
           * into pointer events and the native
           * scrollbar can remain visible.
           *
           * visibility + inert guarantees the
           * released modal cannot hit-test,
           * receive focus, or leave a ghost
           * scrollbar above the live scene.
           * The window wheel listener below
           * remains active and can restore it.
           */
          releaseElement.style.visibility =
            "hidden";

          releaseElement.inert =
            true;

          releaseElement.setAttribute(
            "aria-hidden",
            "true",
          );
        }

        dispatchRevealState(
          true,
          1,
        );

        return;
      }

      /*
       * As soon as the user scrolls back
       * upward, reactivate the modal.
       */
      if (
        releaseElement
      ) {
        releaseElement.style.visibility =
          "";

        releaseElement.style.pointerEvents =
          "";

        releaseElement.inert =
          false;

        releaseElement.removeAttribute(
          "aria-hidden",
        );
      }

      dispatchRevealState(
        false,
        progress,
      );
    };

    const scheduleUpdate =
      () => {
        if (
          frameRef.current !==
          null
        ) {
          return;
        }

        frameRef.current =
          window.requestAnimationFrame(
            update,
          );
      };

    /*
     * When the modal is 100% gone,
     * the pointer is over Three.js.
     *
     * Down-wheel:
     * allow it through to the model.
     *
     * Up-wheel:
     * intercept it and feed it back into
     * the hidden modal so that the modal
     * starts sliding downward again.
     */
    const handleWindowWheel = (
      event: WheelEvent,
    ) => {
      const multiplier =
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

      const delta =
        dominantDelta *
        multiplier;

      /*
       * FULLY REVEALED:
       *
       * Down = let Three.js rotate forward.
       *
       * Up = restore modal instead.
       */
      if (
        fullyRevealedRef.current
      ) {
        if (
          delta >= 0
        ) {
          return;
        }

        event.preventDefault();
        event.stopPropagation();

        if (
          releaseElement
        ) {
          /*
           * Make the retained modal renderable
           * again before feeding the upward wheel
           * delta back into its scroll container.
           */
          releaseElement.style.visibility =
            "";

          releaseElement.style.pointerEvents =
            "";

          releaseElement.inert =
            false;

          releaseElement.removeAttribute(
            "aria-hidden",
          );
        }

        scrollElement.scrollTop +=
          delta;

        fullyRevealedRef.current =
          false;

        scheduleUpdate();

        return;
      }

      /*
       * During the partial reveal, the
       * cursor may already be above the
       * exposed Three.js area.
       *
       * Keep wheel input controlling the
       * modal until it reaches 100%.
       */
      if (
        revealActiveRef.current
      ) {
        const target =
          event.target;

        if (
          target instanceof Node &&
          scrollElement.contains(
            target,
          )
        ) {
          return;
        }

        event.preventDefault();
        event.stopPropagation();

        scrollElement.scrollTop +=
          delta;

        scheduleUpdate();
      }
    };

    /*
     * A direct click on the same top-nav item
     * should bring back this exact retained modal.
     *
     * This is intentionally different from an
     * upward wheel/touch gesture:
     * - wheel/touch reverses naturally from bottom
     * - nav click opens the section from the top
     */
    const handleRestoreReleasedModal =
      () => {
        if (
          !fullyRevealedRef.current
        ) {
          return;
        }

        if (
          releaseElement
        ) {
          releaseElement.style.visibility =
            "";

          releaseElement.style.pointerEvents =
            "";

          releaseElement.inert =
            false;

          releaseElement.removeAttribute(
            "aria-hidden",
          );
        }

        fullyRevealedRef.current =
          false;

        revealActiveRef.current =
          false;

        previousTouchYRef.current =
          null;

        scrollElement.removeAttribute(
          REVEAL_ACTIVE_ATTRIBUTE,
        );

        scrollElement.scrollTop =
          0;

        dispatchRevealState(
          false,
          0,
        );

        scheduleUpdate();
      };

    /*
     * Touch equivalent.
     *
     * Finger moving down while the home
     * scene is visible restores the modal.
     */
    const handleTouchStart = (
      event: TouchEvent,
    ) => {
      previousTouchYRef.current =
        event.touches[0]
          ?.clientY ??
        null;
    };

    const handleTouchMove = (
      event: TouchEvent,
    ) => {
      const currentY =
        event.touches[0]
          ?.clientY;

      const previousY =
        previousTouchYRef.current;

      if (
        currentY ===
          undefined ||
        previousY ===
          null
      ) {
        return;
      }

      const delta =
        previousY -
        currentY;

      previousTouchYRef.current =
        currentY;

      /*
       * Negative delta means the user's
       * finger moved downward — equivalent
       * to scrolling back up.
       */
      if (
        fullyRevealedRef.current &&
        delta < 0
      ) {
        event.preventDefault();
        event.stopPropagation();

        if (
          releaseElement
        ) {
          /*
           * Make the retained modal renderable
           * again before feeding the upward wheel
           * delta back into its scroll container.
           */
          releaseElement.style.visibility =
            "";

          releaseElement.style.pointerEvents =
            "";

          releaseElement.inert =
            false;

          releaseElement.removeAttribute(
            "aria-hidden",
          );
        }

        scrollElement.scrollTop +=
          delta;

        fullyRevealedRef.current =
          false;

        scheduleUpdate();

        return;
      }

      if (
        !revealActiveRef.current
      ) {
        return;
      }

      const target =
        event.target;

      if (
        target instanceof Node &&
        scrollElement.contains(
          target,
        )
      ) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();

      scrollElement.scrollTop +=
        delta;

      scheduleUpdate();
    };

    const handleTouchEnd =
      () => {
        previousTouchYRef.current =
          null;
      };

    scrollElement.addEventListener(
      "scroll",
      scheduleUpdate,
      {
        passive: true,
      },
    );

    window.addEventListener(
      "resize",
      scheduleUpdate,
    );

    /*
     * Capture is important.
     *
     * The up-scroll needs to be caught
     * before the Three.js canvas sees it.
     */
    window.addEventListener(
      "wheel",
      handleWindowWheel,
      {
        capture: true,
        passive: false,
      },
    );

    window.addEventListener(
      RESTORE_RELEASED_MODAL_EVENT,
      handleRestoreReleasedModal,
    );

    window.addEventListener(
      "touchstart",
      handleTouchStart,
      {
        capture: true,
        passive: true,
      },
    );

    window.addEventListener(
      "touchmove",
      handleTouchMove,
      {
        capture: true,
        passive: false,
      },
    );

    window.addEventListener(
      "touchend",
      handleTouchEnd,
      true,
    );

    window.addEventListener(
      "touchcancel",
      handleTouchEnd,
      true,
    );

    const resizeObserver =
      typeof ResizeObserver !==
      "undefined"
        ? new ResizeObserver(
            scheduleUpdate,
          )
        : null;

    resizeObserver?.observe(
      scrollElement,
    );

    resizeObserver?.observe(
      revealElement,
    );

    scheduleUpdate();

    return () => {
      if (
        frameRef.current !==
        null
      ) {
        window.cancelAnimationFrame(
          frameRef.current,
        );

        frameRef.current =
          null;
      }

      scrollElement.removeEventListener(
        "scroll",
        scheduleUpdate,
      );

      window.removeEventListener(
        "resize",
        scheduleUpdate,
      );

      window.removeEventListener(
        "wheel",
        handleWindowWheel,
        true,
      );

      window.removeEventListener(
        RESTORE_RELEASED_MODAL_EVENT,
        handleRestoreReleasedModal,
      );

      window.removeEventListener(
        "touchstart",
        handleTouchStart,
        true,
      );

      window.removeEventListener(
        "touchmove",
        handleTouchMove,
        true,
      );

      window.removeEventListener(
        "touchend",
        handleTouchEnd,
        true,
      );

      window.removeEventListener(
        "touchcancel",
        handleTouchEnd,
        true,
      );

      resizeObserver?.disconnect();

      /*
       * Reset scene state when the modal
       * genuinely closes through Escape,
       * back button, etc.
       */
      window.dispatchEvent(
        new CustomEvent(
          MODAL_REVEAL_STATE_EVENT,
          {
            detail: {
              released: false,
              progress: 0,
            },
          },
        ),
      );

      liftElement.style.transform =
        "";

      liftElement.style.willChange =
        "";

      liftElement.style.removeProperty(
        REVEAL_SHIFT_VARIABLE,
      );

      scrollElement.removeAttribute(
        REVEAL_ACTIVE_ATTRIBUTE,
      );

      if (
        releaseElement
      ) {
        releaseElement.style.pointerEvents =
          "";

        releaseElement.style.visibility =
          "";

        releaseElement.inert =
          false;

        releaseElement.removeAttribute(
          "aria-hidden",
        );
      }
    };
  }, [
    active,
    liftRef,
    releaseRef,
    revealRef,
    scrollRef,
  ]);
}