import { computed, ref } from 'vue'

export type ThemeId = 'mist' | 'night' | 'pink'
export const THEME_STORAGE_KEY = 'touchi:ui-theme:v1'
type Theme = { id: ThemeId; name: string; description: string; dark: boolean; tokens: Record<string, string> }

export const themes: Theme[] = [
  { id: 'night', name: '夜幕蓝紫', description: '深灰底色 · 蓝紫渐变', dark: true, tokens: {
    bg: '#232428', surface: '#313338', soft: '#383A43', text: '#F2F3F5', muted: '#BEC2CE', subtle: '#A6ADBD',
    accent: '#BAABFF', primary: '#5865F2', 'primary-end': '#9457D5',
    gradient: 'linear-gradient(110deg, #5865F2, #9457D5)', 'page-gradient': 'linear-gradient(155deg, #2D2B3F 0%, #232428 32%, #232428 100%)',
    'accent-soft': '#3D3D60', line: '#4B4D5A', 'accent-line': '#7065A0',
    'notice-gradient': 'linear-gradient(110deg, #303043, #353644)',
    gold: '#E7BD73', 'gold-soft': '#3D382E', 'gold-line': '#61533A',
    danger: '#FFA8A0', 'danger-fill': '#A43B4F', 'danger-soft': '#492E34', 'on-primary': '#FFFFFF',
    'on-primary-muted': '#F0EDFF', 'button-surface': '#FFFFFF', 'button-ink': '#5143BD', shadow: 'rgba(0,0,0,.18)'
  } },
  { id: 'pink', name: '元气粉蓝', description: '灰白底色 · 粉蓝渐变', dark: false, tokens: {
    bg: '#F7F9FC', surface: '#FFFFFF', soft: '#EDF3FA', text: '#253B53', muted: '#566C83', subtle: '#718399',
    accent: '#BC286C', primary: '#C92B78', 'primary-end': '#2474A5',
    gradient: 'linear-gradient(110deg, #C92B78, #8653BF 52%, #2474A5)', 'page-gradient': 'linear-gradient(135deg, #FFF7FB, #F0F9FF 55%, #F7F9FC)',
    'accent-soft': '#FCEBF4', line: '#E4EAF3', 'accent-line': '#ECC7DC',
    'notice-gradient': 'linear-gradient(110deg, #FFF0F8, #E5F3FF)',
    gold: '#94651E', 'gold-soft': '#FFF6E6', 'gold-line': '#EDDFC0',
    danger: '#B63638', 'danger-fill': '#B63638', 'danger-soft': '#FFF0ED', 'on-primary': '#FFFFFF',
    'on-primary-muted': '#FFFFFF', 'button-surface': '#FFFFFF', 'button-ink': '#BC286C', shadow: 'rgba(45,69,101,.07)'
  } },
  { id: 'mist', name: '雾蓝', description: '灰蓝白底色 · 清爽雾蓝', dark: false, tokens: {
    bg: '#F5F9FE', surface: '#FFFFFF', soft: '#E9F1FB', text: '#243E5D', muted: '#536C88', subtle: '#71859D',
    accent: '#2D66AC', primary: '#2E68AF', 'primary-end': '#3A78BF',
    gradient: 'linear-gradient(110deg, #2E68AF, #3674BB)', 'page-gradient': 'linear-gradient(150deg, #F5F9FE, #F3F7FD)',
    'accent-soft': '#E8F1FF', line: '#E0E9F5', 'accent-line': '#C7DAF2',
    'notice-gradient': 'linear-gradient(110deg, #F0F7FF, #E1EDFD)',
    gold: '#94651E', 'gold-soft': '#FBF5E9', 'gold-line': '#EADFCB',
    danger: '#B63638', 'danger-fill': '#B63638', 'danger-soft': '#FFF0ED', 'on-primary': '#FFFFFF',
    'on-primary-muted': '#E6F0FF', 'button-surface': '#FFFFFF', 'button-ink': '#2D66AC', shadow: 'rgba(45,69,101,.07)'
  } }
]

const selectedId = ref<ThemeId>('mist')
export const currentTheme = computed(() => themes.find(theme => theme.id === selectedId.value)!)
export function isThemeId(value: unknown): value is ThemeId { return themes.some(theme => theme.id === value) }
export function themeStyleFor(theme: Theme) {
  return Object.entries(theme.tokens).map(([key, value]) => `--ui-${key}:${value}`).join(';')
    + `;--app-page-bg:${theme.tokens.bg};background:${theme.tokens['page-gradient']};color:${theme.tokens.text};min-height:100vh`
}
export const appThemeStyle = computed(() => themeStyleFor(currentTheme.value))

export function initializeTheme() {
  try { const saved = uni.getStorageSync(THEME_STORAGE_KEY); selectedId.value = isThemeId(saved) ? saved : 'mist' }
  catch { selectedId.value = 'mist' }
}

// Native navigation and tab bars sit outside the Vue root and need their own updates.
export function applyThemeChrome() {
  const theme = currentTheme.value, t = theme.tokens, fail = () => {}
  uni.setNavigationBarColor?.({ frontColor: theme.dark ? '#ffffff' : '#000000', backgroundColor: t.bg, fail })
  uni.setBackgroundColor?.({ backgroundColor: t.bg, backgroundColorTop: t.bg, backgroundColorBottom: t.bg, fail })
  uni.setBackgroundTextStyle?.({ textStyle: theme.dark ? 'light' : 'dark', fail })
  uni.setTabBarStyle?.({ color: t.muted, selectedColor: t.accent, backgroundColor: t.surface, borderStyle: theme.dark ? 'black' : 'white', fail })
  ;['home', 'order', 'rank', 'expert', 'profile'].forEach((name, index) => {
    uni.setTabBarItem?.({ index, iconPath: `/icons/themes/${theme.id}/tab-${name}.png`, selectedIconPath: `/icons/themes/${theme.id}/tab-${name}-active.png`, fail })
  })
}

export function selectTheme(id: unknown): boolean {
  if (!isThemeId(id)) return false
  selectedId.value = id
  applyThemeChrome()
  try { uni.setStorageSync(THEME_STORAGE_KEY, id); return true }
  catch { uni.showToast?.({ title: '已切换，本机偏好保存失败', icon: 'none' }); return false }
}

// Registered once; every page binds this reactive value on its existing root.
export const themeMixin = {
  computed: {
    $appThemeStyle() { return appThemeStyle.value },
    $appThemeAccent() { return currentTheme.value.tokens.accent }
  },
  onShow(this: { $mpType?: string }) {
    // Component onShow also runs in mini-programs; only a page owns native chrome.
    if (this.$mpType === 'page') applyThemeChrome()
  }
}
