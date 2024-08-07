# RMBW2

## 理念

### 记忆

为了更好地记忆单词，我们需要更多联系和更少的核心信息

### 更多的联系

所谓“条条大路通罗马”，对某个单词越多的联系就意味着更好地意识到这个单词，进而记住它。

这个联系，可以是语境--即单词在某个句子或段落的位置，也可以是这个单词的近反义词、词源等

### 更少的核心信息

更少的信息更便于我们记忆。不需要蛇吞大象，只需要聚沙成塔。每次只记忆这个单词在这个语境的一个意思而不需要关注其他意思或用法。

### 编写自己的词典

大多数词典对于一个单词的解释，要么太多，把同一概念从不同角度诠释，这也许更严谨；要么太少，某些特殊含义没有标识。

而在这里，单词的每个义项，都由自己书写编辑，形成独一无二的个人词典。只需按自己的判断分类，编写或详细或极简的义项。

## 基本使用

导入文章，通过对其生词标记，借助 AI 解释，实现语境记忆

### 先前准备

chatgpt api key，你可以用 [GPT API FREE](https://github.com/chatanywhere/GPT_API_free)。不用也可以，但需要更多时间编辑义项，你可以要借助工具书或其他翻译工具。

### 学习

点击左上角第一个按钮，在弹窗中可添加或改变书籍

添加书籍后，默认进入编辑界面，可以输入文章，也可以点击下方按钮上传文档

编辑完成后，点击右上角 √ 按钮确认，进入标记学习模式

点击陌生单词以标记，再次点击可唤出生词本

点击+可在弹窗中编辑该词义义项，按 √ 确认

### 复习

点击顶栏五角星切换到复习模式，按刷新即可显示复习卡片。

根据提示，回忆单词意思。点击页面查看答案，并选择下方的三个按钮--X（回忆错误）、？（无法回忆）、√（回忆正确）。程序会自动根据反馈，为该单词之后的出现编排。

## 具体介绍

### 按钮

左往右：书架、章节、复习、设置、标题栏、页面样式、编辑/编辑完成、标记

### 书架

书籍分为词书和普通书籍，词书用于单词记忆统计和学习生词的筛选，普通书籍用于学习生词。

在本地书籍中，你可以切换书籍，也可以添加书籍。添加书籍默认添加章节，并进入编辑模式。右键词书，可重命名或编辑元数据。添加书籍默认为普通书籍，通过修改元数据可将其变为词书，章节内一行为一个单词。

在在线书籍，你可以点击下载，稍等片刻即可在本地书籍见到。已下载的书籍，再次在在线书籍界面点击即可重新下载（可能伴随着更新）。

在线书籍的远程地址可以在设置中设置，远程地址具体细节请查看 [rmbw-book](https://github.com/xushengfeng/rmbw-book)仓库，你可以仿照它建立自己的远程书籍库，也可以对其进行贡献。

点击书籍才能关闭弹窗。

目前书籍无法删除。

### 章节

根据图标可添加章节，也可切换章节。

若有未学习的词，章节右上角会有角标提示。

### 编辑区

在编辑区，可以输入或上传文档。上传文档支持 txt 和 md

支持 md 标题，如`#`加空格是一级标题，`##`加空格是二级标题，以此类推，其他 md 格式暂时不支持。

右键文字可直接跳转到编辑模式并自动选中文字。

#### AI

AI 编辑区以顶格`==ai==`打头，中间是对话内容，以`====`结束

见示例

```markdown
普通文字

==ai==

> 你好

====
```

按下回车后，会有 AI 回复，用户只需换行输入`> 文字`即可。

可以创建多个 AI 编辑区，每个编辑区内对话都是独立的，但都会预先传入第一个编辑区前的文章。

### 生词本

点击标记单词，再次点击唤出生词本。

还有两个选择标记，按住圆形区域拖动他们可更改语境。

生词本最上面一排按钮分别是：上一个标记、下一个标记、转为句子、播放语境发音、编辑笔记、关闭生词本。

#### 单词

默认为单词模式。

可以在第二排编辑单词，如标记词是-ing 形式，你若需要原型，可手动编辑或选择右边的单词列表。播放按钮用于播放单词发音。

在该单词没有记录的词义时，需要先添加词义，否则可选词义。若已有词义中无需要的词义，可添加词义。

添加词义或选择词义编辑都弹出编辑框。编辑框下排有一系列 AI 按钮。

基本意思--单词的英文简明释义、详细英文释义和中文释义

音标--单词 IPA 音标

emoji--用表情符号生动解释单词意思

近义词--返回同义词（用=标记）或近义词（用约等号标记）

反义词--返回反义词（用-标记）

这些按钮可以借 AI 生成相关文字自动添加到编辑区域，你可以手动编辑，或选择文字，点击按钮覆盖。

“所有”等同按下上述几个按钮。

AI 按钮可弹出对话悬浮窗，语法和编辑区一样，但不需要开头和结尾标记（`==ai==`）。按 √ 可将对话添加到编辑区。默认传入了单词和语境，你可以用“这个词”或“这句话”指代。

词典按钮可弹出词典框，点击义项（可多选），确认后可添加到编辑区域。词典需要在设置上传。

按 √ 确认。

#### 句子

点击转为句子后，将只记录语境，你可以用其学习语境的词组或用法。

转为句子后就不能在转回单词了。

#### 翻译

单词模式和句子模式都支持翻译语境，点击翻译按钮即可。

翻译的文字可编辑，但只有句子模式可以保存翻译。

翻译默认使用缓存，若对翻译不满意，在翻译文字不为空的前提下再次点击翻译按钮即可重新翻译。

#### 笔记

单词笔记支持词根词缀、音节分词、词源。音节分词不需要 AI。

句子笔记支持长难句拆分成短句等。

### 标记导航

点击标记，可查看该章节按位置排序的所有标记--无论是单词还是句子。点击即可跳转，右键可在菜单删除。

可以自动标记。选择词书，将标记词书中未学习的词。不选词书，将借 AI 完成标记。AI 标记需要在设置中描述你的词汇水平。

即使使用自动标记，仍需要阅读文章。自动标记需要手动标记确认。

自动标记不标记忽略词书的单词。

### 复习

复习使用了 fsrs 算法进行分析。该算法借助对某个知识记忆程度的反馈自动编排重复记忆的时间，有助你自由地复习知识而无需操心更多。

点击复习按钮即可进入。

可以选择复习单词、单词拼写、句子

按刷新键显示卡片。复习安排数据将在 2.4 小时后过期，记得再次按刷新键。

可选复习范围，选择复习词书后，将只复习相关词书学习过的单词。

#### 单词

根据提示判断 X（回忆错误）、？（无法回忆）还是 √（回忆正确）。点击按钮后显示答案，再次点击进入下一张卡片复习。

<kbd>1</kbd>对应错误、<kbd>2</kbd>对应无法回忆、<kbd>3</kbd>对应正确、<kbd>空格</kbd>对应显示答案。

对于回忆正确的卡片，程序会根据阅读速度（在设置里可具体设置时间）判断是在犹豫后才做对还是很迅速做对。犹豫的卡片不久后会重新考察。

选择 AI，程序将对复习的卡片（而不是首次学习的）生成同一语境的例句。

#### 拼写

根据发音拼写单词。

若拼错，会以音节分词展示单词，并标记哪个字母缺少（绿色）、哪个字母多余（红色）。需要拼写正确才能进入下一张卡片。

可选提示，但视为犹豫。

#### 句子

根据句子回忆翻译和笔记，其他与单词一样。

### 标题栏

标题栏显示 书籍名-章节名 点击可编辑章节名

### 页面样式

点击样式按钮，可编辑字体、字体大小、行间距、内容宽度、颜色。选择纸质背景，可模拟纸张粗糙的质感。

## 高级

### 词典

你可以将 mdict 文件转为 JSON 文件，以下是一个例子：

```json
{
    "id": "词典id",
    "lang": "语言",
    "dic": {
        "单词1": { "text": "内容一" },
        "单词2": { "text": "内容二" },
        "单词3": { "text": "单词1", "isAlias": true }
    }
}
```

若`isAlias`为 true，则该 key 对应的内容为 text 作为 key 指向的内容，如上面例子“单词 3”对应的内容为“内容一”

在`lib/change.js`有个例子，更改文件路径，使用 nodejs 运行即可。

### 忽略词书

需要自己创建一个章节，将书籍设置为词书。

可在设置里设置 id。

如果你有一定的词汇量，那就无需再次学习那些简单的词了。将它们添加到忽略词书，软件会知道你掌握了它们，将它们算入词汇量，并在自动标记时忽略他们。
