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
  line-height: inherit;
}

button::after {
  border: none;
}
</style>
