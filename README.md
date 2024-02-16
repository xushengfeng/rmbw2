# rmbw2

## 简介

rmbw2 是 [rmbw](https://github.com/xushengfeng/rmbw) 的升级版

不同于 rmbw 的简单背单词，rmbw2 使用了语境记忆，通过阅读创建语境来辅助记忆，这是受 “[Context 语境](https://sspai.com/post/80594#!)” 和“[Flipulous](https://www.bilibili.com/video/av785940794/?vd_source=c61db97163a29585cec778b34d11655d)”的启发。

rmbw2 对于单词的记忆有两个理念：1.语境记忆；2.一次只记忆一个意思。

由于语境的需要，rmbw2 加入了类似阅读器的功能，可以自行摘录、编辑文章，在 rmbw2 中完成对生词的标注和学习。

## 特色

### 自定义义项，编写你自己的词典

用户既可以为单词的单个意思编辑内容，也可以为整个单词添加笔记。

借助 ai 功能，可以生成简明释义、emoji、词根词缀、词源等

当然，你也可以自定词典。在[tutorial.md](docs/tutorial.md) “高级”一节中有将 mdic 转为可用词典的指南。

### 单词复习

rmbw2 还使用了 fsrs 算法对单词复习进行安排。

继承 rmbw 的单词拼写模式，可以反复练习单词拼写。

### 单词本

可自定义单词本，并结合记忆数据，分析单词的掌握情况。
