<script lang="ts">
import { playerPresence } from './utils/playerPresence'

export default {
  onLaunch() { playerPresence.launch() },
  onShow() { playerPresence.show() },
  onHide() { playerPresence.hide() }
}
</script>

<style lang="scss">
@import './styles/theme.scss';

page {
  --app-page-bg: #f7f9fc;
  min-height: 100%;
  background: var(--ui-bg);
  color: var(--ui-text);
  font-family: -apple-system, BlinkMacSystemFont, 'PingFang SC', 'Microsoft YaHei', sans-serif;
  --ui-bg: #F5F9FE;
  --ui-surface: #FFFFFF;
  --ui-soft: #E9F1FB;
  --ui-text: #243E5D;
  --ui-muted:#536C88;
  --ui-subtle: #71859D;
  --ui-accent: #2D66AC;
  --ui-primary: #2E68AF;
  --ui-primary-end: #3A78BF;
  --ui-gradient: linear-gradient(110deg, #2E68AF, #3674BB);
  --ui-page-gradient: linear-gradient(150deg, #F5F9FE, #F3F7FD);
  --ui-accent-soft: #E8F1FF;
  --ui-line: #E0E9F5;
  --ui-accent-line: #C7DAF2;
  --ui-notice-gradient: linear-gradient(110deg, #F0F7FF, #E1EDFD);
  --ui-gold: #94651E;
  --ui-gold-soft: #FBF5E9;
  --ui-gold-line: #EADFCB;
  --ui-danger-fill:#B63638;--ui-danger: #B63638;
  --ui-danger-soft: #FFF0ED;
  --ui-on-primary: #FFFFFF;
  --ui-on-primary-muted: #E6F0FF;
  --ui-button-surface: #FFFFFF;
  --ui-button-ink: #2D66AC;
  --ui-shadow: rgba(45,69,101,.07);
}

view,
text,
button,
input,
textarea {
  box-sizing: border-box;
}

button {
  margin: 0;
  padding: 0;
  border: 0;
  background: transparent;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  line-height: 1.2;
  vertical-align: middle;
}

button::after {
  border: none;
}

/* 钱包入口已迁移到“我的/个人中心”，账号资料页不再重复展示旧卡片。 */
.account-page .wallet-entry-card {
  display: none !important;
}
</style>
