import {
  Component,
  ElementRef,
  Output,
  EventEmitter,
  ViewChild,
  Input,
  TemplateRef,
  OnInit
} from '@angular/core';

import {
  isInputOrTextAreaElement,
  getContentEditableCaretCoords
} from './mention-utils';
import { getCaretCoordinates } from './caret-coords';

/**
 * Angular 2 Mentions.
 * https://github.com/dmacfarlane/angular-mentions
 *
 * Copyright (c) 2016 Dan MacFarlane
 */
@Component({
  selector: 'mention-list',
  styles: [
      `
      .dropdown-menu {
        position: absolute;
        top: 100%;
        left: 0;
        z-index: 1000;
        display: none;
        float: left;
        min-width: 160px;
        padding: 5px 0;
        margin: 2px 0 0;
        text-align: left;
        list-style: none;
        background-color: #fff;
        -webkit-background-clip: padding-box;
        background-clip: padding-box;
        border: 1px solid rgba(0,0,0,.15);
        border-radius: 4px;
        -webkit-box-shadow: 0 6px 12px rgba(0,0,0,.175);
        box-shadow: 0 6px 12px rgba(0,0,0,.175);
      }
      .dropdown-menu>.active>a, .dropdown-menu>.active>a:focus, .dropdown-menu>.active>a:hover {
        color: #fff;
        text-decoration: none;
        background-color: #337ab7;
        outline: 0;
      }
      .dropdown-menu>li>a {
        display: block;
        padding: 3px 20px;
        clear: both;
        font-weight: 400;
        line-height: 1.42857143;
        color: #333;
        white-space: nowrap;
        border-radius: 0;
      }
      .dropdown-menu > li:first-child {
        padding-top: 0;
      }
      .dropdown-menu > li:last-child {
        padding-bottom: 0;
      }
      .dropdown-menu>li>a:focus, .dropdown-menu>li>a:hover {
        color: #262626;
        text-decoration: none;
        background-color: #f5f5f5;
      }
      .scrollable-menu {
        display: block;
        height: auto;
        max-height: 300px;
        overflow: auto;
      }
      `, `
        [hidden] {
          display: none;
        }
      `, `
        li.active {
          background-color: #f7f7f9;
        }
      `
  ],
  template: `
    <ng-template #defaultItemTemplate let-item="item">
      {{item[labelKey]}}
    </ng-template>
    <ul #list [hidden]="hidden" class="dropdown-menu scrollable-menu">
      <li *ngFor="let item of items; let i = index" [class.active]="activeIndex==i">
        <a class="dropdown-item" (mousedown)="activeIndex=i;itemClick.emit();$event.preventDefault()">
          <ng-template [ngTemplateOutlet]="itemTemplate" [ngTemplateOutletContext]="{'item':item}"></ng-template>
        </a>
      </li>
    </ul>
  `
})
export class MentionListComponent implements OnInit {
  @Input() labelKey = 'label';
  @Input() itemTemplate: TemplateRef<any>;
  @Output() itemClick = new EventEmitter();
  @ViewChild('list') list: ElementRef;
  @ViewChild('defaultItemTemplate') defaultItemTemplate: TemplateRef<any>;
  items = [];
  activeIndex = 0;
  private _hidden = false;

  constructor(private element: ElementRef) {
  }

  ngOnInit() {
    if (!this.itemTemplate) {
      this.itemTemplate = this.defaultItemTemplate;
    }
  }

  set hidden(isHidden) {
    this._hidden = isHidden;
  }

  get hidden(): boolean {
    return this._hidden;
  }

  // lots of confusion here between relative coordinates and containers
  position(nativeParentElement: HTMLInputElement, iframe: HTMLIFrameElement = null, dropUp: boolean) {
    let coords = {top: 0, left: 0};
    if (isInputOrTextAreaElement(nativeParentElement)) {
      // parent elements need to have postition:relative for this to work correctly?
      coords = getCaretCoordinates(nativeParentElement, nativeParentElement.selectionStart);
      coords.top = nativeParentElement.offsetTop + coords.top + 16;
      coords.left = nativeParentElement.offsetLeft + coords.left;
    } else if (iframe) {
      let context: { iframe: HTMLIFrameElement, parent: Element } = {iframe: iframe, parent: iframe.offsetParent};
      coords = getContentEditableCaretCoords(context);
    } else {
      let doc = document.documentElement;
      let scrollLeft = (window.pageXOffset || doc.scrollLeft) - (doc.clientLeft || 0);
      let scrollTop = (window.pageYOffset || doc.scrollTop) - (doc.clientTop || 0);

      // bounding rectangles are relative to view, offsets are relative to container?
      let caretRelativeToView = getContentEditableCaretCoords({iframe: iframe});
      let parentRelativeToContainer: ClientRect = nativeParentElement.getBoundingClientRect();

      coords.top = caretRelativeToView.top - parentRelativeToContainer.top + nativeParentElement.offsetTop - scrollTop;
      coords.left = caretRelativeToView.left - parentRelativeToContainer.left + nativeParentElement.offsetLeft - scrollLeft;
    }
    let el: HTMLElement = this.element.nativeElement;
    this.list.nativeElement.style.marginBottom = dropUp ? '24px' : null;
    el.className = dropUp ? 'dropup' : null;
    el.style.position = 'absolute';
    el.style.left = coords.left + 'px';
    el.style.top = coords.top + 'px';
  }

  get activeItem() {
    return this.items[this.activeIndex];
  }

  activateNextItem() {
    // adjust scrollable-menu offset if the next item is out of view
    let listEl: HTMLElement = this.list.nativeElement;
    let activeEl = listEl.getElementsByClassName('active').item(0);
    if (activeEl) {
      let nextLiEl: HTMLElement = <HTMLElement>activeEl.nextSibling;
      if (nextLiEl && nextLiEl.nodeName == 'LI') {
        let nextLiRect: ClientRect = nextLiEl.getBoundingClientRect();
        if (nextLiRect.bottom > listEl.getBoundingClientRect().bottom) {
          listEl.scrollTop = nextLiEl.offsetTop + nextLiRect.height - listEl.clientHeight;
        }
      }
    }
    // select the next item
    this.activeIndex = Math.max(Math.min(this.activeIndex + 1, this.items.length - 1), 0);
  }

  activatePreviousItem() {
    // adjust the scrollable-menu offset if the previous item is out of view
    let listEl: HTMLElement = this.list.nativeElement;
    let activeEl = listEl.getElementsByClassName('active').item(0);
    if (activeEl) {
      let prevLiEl: HTMLElement = <HTMLElement>activeEl.previousSibling;
      if (prevLiEl && prevLiEl.nodeName == 'LI') {
        let prevLiRect: ClientRect = prevLiEl.getBoundingClientRect();
        if (prevLiRect.top < listEl.getBoundingClientRect().top) {
          listEl.scrollTop = prevLiEl.offsetTop;
        }
      }
    }
    // select the previous item
    this.activeIndex = Math.max(Math.min(this.activeIndex - 1, this.items.length - 1), 0);
  }

  resetScroll() {
    this.list.nativeElement.scrollTop = 0;
  }
}
