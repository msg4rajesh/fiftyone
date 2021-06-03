/**
 * Copyright 2017-2021, Voxel51, Inc.
 */

import { VideoState } from "../state";
import { BaseElement, Events } from "./base";
import {
  getFrameNumber,
  getFrameString,
  getTime,
  getTimeString,
  ICONS,
  makeCheckboxRow,
  makeWrapper,
} from "./util";

export class PlayButtonElement extends BaseElement<
  VideoState,
  HTMLImageElement
> {
  private playing: boolean;

  getEvents(): Events<VideoState> {
    return {
      click: ({ event, update }) => {
        event.preventDefault();
        event.stopPropagation();
        update(({ playing }) => ({ playing: !playing, showOptions: false }));
      },
    };
  }

  createHTMLElement() {
    const element = document.createElement("img");
    element.className = "looker-clickable";
    element.style.gridArea = "2 / 2 / 2 / 2";
    return element;
  }

  renderSelf({ playing }) {
    if (playing !== this.playing) {
      if (playing) {
        this.element.src = ICONS.pause;
        this.element.title = "Pause (space)";
      } else {
        this.element.src = ICONS.play;
        this.element.title = "Play (space)";
      }
      this.playing = playing;
    }
    return this.element;
  }
}

export class SeekBarElement extends BaseElement<VideoState, HTMLInputElement> {
  getEvents(): Events<VideoState> {
    return {
      click: ({ event }) => {
        event.stopPropagation();
      },
      change: ({ update }) => {
        const progress = this.element.valueAsNumber / 100;
        update(({ duration, config: { frameRate } }) => {
          return {
            frameNumber: getFrameNumber(
              duration * progress,
              duration,
              frameRate
            ),
          };
        });
      },
      mousedown: ({ update }) =>
        update({
          locked: false,
          seeking: true,
        }),
      mouseup: ({ update }) => {
        const progress = this.element.valueAsNumber / 100;
        update(({ duration, config: { frameRate } }) => {
          return {
            frameNumber: getFrameNumber(
              duration * progress,
              duration,
              frameRate
            ),
            seeking: false,
          };
        });
      },
    };
  }

  createHTMLElement() {
    const element = document.createElement("input");
    element.setAttribute("type", "range");
    element.setAttribute("min", "0");
    element.setAttribute("max", "100");
    element.className = "looker-seek-bar";
    element.style.gridArea = "1 / 2 / 1 / 6";
    return element;
  }

  renderSelf({ frameNumber, config: { frameRate, thumbnail }, duration }) {
    if (thumbnail) {
      return this.element;
    }
    if (duration !== null) {
      this.element.style.display = "block";
      //@ts-ignore
      this.element.value =
        ((frameNumber - 1) / Math.max(frameRate * duration - 1, 1)) * 100;
    } else {
      this.element.style.display = "none";
    }
    return this.element;
  }
}

export class UseFrameNumberOptionElement extends BaseElement<VideoState> {
  checkbox: HTMLInputElement;
  label: HTMLLabelElement;

  getEvents(): Events<VideoState> {
    return {
      click: ({ event, update }) => {
        event.stopPropagation();
        event.preventDefault();
        update(({ options: { useFrameNumber } }) => {
          return {
            options: { useFrameNumber: !useFrameNumber },
          };
        });
      },
    };
  }

  createHTMLElement() {
    [this.label, this.checkbox] = makeCheckboxRow("Use frame number", false);
    return makeWrapper([this.label]);
  }

  renderSelf({ options: { useFrameNumber } }) {
    this.checkbox.checked = useFrameNumber;
    return this.element;
  }
}

export class TimeElement extends BaseElement<VideoState> {
  createHTMLElement() {
    const element = document.createElement("div");
    element.className = "looker-time";
    element.style.gridArea = "2 / 3 / 2 / 3";
    return element;
  }

  renderSelf({
    frameNumber,
    duration,
    config: { frameRate },
    options: { useFrameNumber },
  }) {
    const timestamp = useFrameNumber
      ? getFrameString(frameNumber, duration, frameRate)
      : getTimeString(frameNumber, frameRate, duration);
    this.element.innerHTML = timestamp;
    return this.element;
  }
}

export class VideoElement extends BaseElement<VideoState, HTMLVideoElement> {
  private src: string;
  private frameNumber: number;

  getEvents(): Events<VideoState> {
    return {
      error: ({ event, dispatchEvent }) => {
        dispatchEvent("error", { event });
      },
      loadeddata: ({ update, dispatchEvent }) => {
        update(({ playing, options: { autoplay } }) => {
          return {
            loaded: true,
            playing: autoplay || playing,
            duration: this.element.duration,
          };
        });
        dispatchEvent("load");
      },
      play: ({ event, update }) => {
        const target = event.target as HTMLVideoElement;
        const callback = () => {
          update(
            ({
              playing,
              duration,
              locked,
              fragment,
              config: { frameRate },
              options: { loop },
            }) => {
              let newFrameNumber = getFrameNumber(
                target.currentTime,
                duration,
                frameRate
              );

              const resetToFragment =
                locked && fragment && newFrameNumber > fragment[1];
              if (!resetToFragment) {
                this.frameNumber = newFrameNumber;
              } else if (loop) {
                newFrameNumber = fragment[0];
              }

              return {
                frameNumber: newFrameNumber,
                playing: resetToFragment ? (loop ? true : false) : playing,
              };
            },
            (_, { seeking }) => {
              if (!seeking) {
                requestAnimationFrame(callback);
              }
            }
          );
        };

        requestAnimationFrame(callback);
      },
      ended: ({ update }) => {
        update(({ locked, fragment, options: { loop } }) => {
          if (loop) {
            return {
              frameNumber: locked && fragment ? fragment[0] : 1,
              playing: true,
            };
          } else {
            return {
              playing: false,
            };
          }
        });
      },
      timeupdate: ({ dispatchEvent, update }) => {
        update(({ duration, config: { frameRate } }) => {
          dispatchEvent("timeupdate", {
            frameNumber: getFrameNumber(
              this.element.currentTime,
              duration,
              frameRate
            ),
          });

          return {};
        });
      },
    };
  }

  createHTMLElement() {
    const element = document.createElement("video");
    element.className = "looker-video";
    element.setAttribute("preload", "metadata");
    element.muted = true; // this works whereas .setAttribute does not
    this.frameNumber = 1;
    return element;
  }

  renderSelf({
    config: { src, frameRate },
    frameNumber,
    seeking,
    playing,
    loaded,
  }) {
    if (this.src !== src) {
      this.src = src;
      this.element.setAttribute("src", src);
    }
    if (this.frameNumber !== frameNumber) {
      this.element.currentTime = getTime(frameNumber, frameRate);
    }
    if (seeking && !this.element.paused) {
      this.element.pause();
    }
    if (loaded && playing && this.element.paused) {
      this.element.play();
    }
    if (loaded && !playing && !this.element.paused) {
      this.element.pause();
    }
    return this.element;
  }
}

export function withVideoLookerEvents(): () => Events<VideoState> {
  return function () {
    return {
      keydown: ({ event, update }) => {
        if (event.key === " ") {
          update(({ playing, config: { thumbnail } }) => {
            return thumbnail
              ? {}
              : {
                  playing: !playing,
                };
          });
        }

        if (event.key === "ArrowLeft") {
          update(({ frameNumber, locked, fragment, playing }) => {
            if (!playing) {
              return {};
            }
            const limit = locked && fragment ? fragment[0] : 1;
            return { frameNumber: Math.max(limit, frameNumber - 1) };
          });
        }

        if (event.key === "ArrowRight") {
          update(
            ({
              frameNumber,
              duration,
              locked,
              fragment,
              playing,
              config: { frameRate },
            }) => {
              if (!playing) {
                return {};
              }
              const limit =
                locked && fragment
                  ? fragment[1]
                  : getFrameNumber(duration, duration, frameRate);
              return { frameNumber: Math.max(limit, frameNumber + 1) };
            }
          );
        }
      },
      mouseenter: ({ update }) => {
        update(({ config: { thumbnail } }) => {
          if (thumbnail) {
            return {
              playing: true,
            };
          }
          return {};
        });
      },
      mouseleave: ({ update }) => {
        update(({ config: { thumbnail } }) => {
          if (thumbnail) {
            return {
              playing: false,
            };
          }
          return {};
        });
      },
    };
  };
}