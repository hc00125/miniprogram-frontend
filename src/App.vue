<script lang="ts">
export default {}
</script>

<style lang="scss">
@import './styles/theme.scss';

page {
  min-height: 100%;
  background: #fbf7ef;
  color: #1e2719;
  font-family: -apple-system, BlinkMacSystemFont, 'PingFang SC', 'Microsoft YaHei', sans-serif;
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