# PicCat 图片转换猫

> WEBP 又打不开？交给猫。

喵造实验室 010。一个 local-first 的 Windows 图片格式转换与尺寸处理工具。

## v0.1

- JPG / JPEG → PNG / WEBP
- PNG → JPG / WEBP
- WEBP → PNG / JPG
- 支持 AVIF / TIFF / GIF 静态首帧作为输入
- 批量转换
- 自动应用 EXIF 旋转
- 保持原尺寸 / 百分比 / 最长边 / 固定宽度 / 固定高度 / 指定宽高
- 锁定比例，避免图片拉伸
- 可选“不放大小图”
- JPG / WEBP 质量调节
- PNG 转 JPG 可选背景色
- 输出文件名后缀
- 常用预设：小红书 3:4、头像 1:1、16:9 封面、1920px 长边、50% 缩放
- 原图不覆盖；同名输出自动避让
- 全程本地处理，不上传图片

## 运行

```bash
npm install
npm test
npm run check
npm start
```

## Windows 安装包

```bash
npm run dist:win
```

## 产品原则

PicCat 默认不覆盖原图，所有转换都输出到用户选择的目录。
