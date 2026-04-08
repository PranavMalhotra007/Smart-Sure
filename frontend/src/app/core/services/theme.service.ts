import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private _dark = new BehaviorSubject<boolean>(false);
  isDark$ = this._dark.asObservable();

  get isDark(): boolean { return this._dark.value; }

  constructor() {
    const saved = localStorage.getItem('ss-theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const initial = saved ? saved === 'dark' : prefersDark;
    this._apply(initial);
  }

  toggle() { this._apply(!this._dark.value); }

  private _apply(dark: boolean) {
    this._dark.next(dark);
    if (dark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('ss-theme', dark ? 'dark' : 'light');
  }
}
