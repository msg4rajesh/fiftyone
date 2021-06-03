/**
 * Copyright 2017-2021, Voxel51, Inc.
 */

import { BaseState, StateUpdate } from "../state";

type ElementEvent<State extends BaseState, E extends Event> = (args: {
  event: E;
  update: StateUpdate<State>;
  dispatchEvent: (eventType: string, details?: any) => void;
}) => void;

export type Events<State extends BaseState> = {
  [K in keyof HTMLElementEventMap]?: ElementEvent<
    State,
    HTMLElementEventMap[K]
  >;
};

export abstract class BaseElement<
  State extends BaseState,
  Element extends HTMLElement = HTMLElement
> {
  readonly children: BaseElement<State>[] = [];
  readonly element: Element;

  constructor(
    state: Readonly<State>,
    update: StateUpdate<State>,
    dispatchEvent: (eventType: string, details?: any) => void,
    children?: BaseElement<State>[]
  ) {
    this.children = children;
    this.element = this.createHTMLElement(state);
    Object.entries(this.getEvents()).forEach(([eventType, handler]) => {
      this.element.addEventListener(
        eventType,
        (event) =>
          // @ts-ignore
          handler({ event, update, dispatchEvent }),
        false
      );
    });
  }

  protected getEvents(): Events<State> {
    return {};
  }

  abstract createHTMLElement(state: Readonly<State>): Element;

  isShown(state: Readonly<State>): boolean {
    return true;
  }

  render(state: Readonly<State>): Element {
    const self = this.renderSelf(state);
    const children = this.renderChildren(state);

    children.forEach((child, i) => {
      const isShown = this.children[i].isShown(state);
      if (child.parentNode === this.element) {
        if (!isShown) {
          this.element.removeChild(child);
        }
        return;
      }
      if (isShown) self.appendChild(child);
    });
    return self;
  }

  renderChildren(state: Readonly<State>): HTMLElement[] {
    return this.children.map((child) => child.render(state));
  }

  abstract renderSelf(state: Readonly<State>): Element;
}