// 画像を追加したら `node gen-manifest.js` で manifest.js を再生成
const fs=require("fs");
// キャラのアイドルフレームは _1 だけプリロード（カード用＆初期フレーム）。
// _2〜_6 は装備キャラ表示時に遅延ロード（建物段階の Foo_Build_2 等は除外しない）。
const files=fs.readdirSync("assets/images")
  .filter(f=>/\.(png|jpg|jpeg|webp)$/i.test(f))
  .filter(f=>!/^Char_.*_[2-6]\.png$/i.test(f))
  .sort();
fs.writeFileSync("manifest.js","// AUTO-GENERATED: プリロード対象の全画像。再生成: node gen-manifest.js\nwindow.NDM_IMAGES = "+JSON.stringify(files.map(f=>"assets/images/"+f))+";\n");
console.log("manifest.js:",files.length,"images");
