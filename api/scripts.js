const fs = require('fs');

module.exports = function (res) {
  let string = '';
  const titles = [];
  res.filter((v, i) => !!v).map((d, i) => {
    if (i === 15) return;
    const folderPath = `./js/resources/blog${i}_${d.title}`;
    // if (i === 15) {
    //   fs.mkdir(folderPath, '777', (err) => {
    //     if (err) throw err;
    //   });
    // }
    string += `//${d.title} \n import blog${i} from './blog${i}_${d.title}';\n`;
    titles.push(`blog${i}`);
    fs.writeFile(`${folderPath}/index.js`, `
            export default {
      title: '${d.title}',
      url: '${d.url}',
      tags: [${d.tags.map((d) => `'${d.name}'`)}],
      date: '${d.addTime}',
      load: () => import(/* webpackChunkName: "blog${i}_${d.title.replace(/[\s_-][^\s_-]/g, (match) => match.charAt(1).toUpperCase())}" */ './view'),
    };
    `, (err) => {
      if (err) throw err;
      console.log('saved index.js');
    });

    // //content.md
    // fs.writeFile(`${folderPath}/content.md`, d.content, (err) => {
    //   if (err) throw err;
    // });
    // //view.js
  //   fs.writeFile(`${folderPath}/view.js`, `import React from 'react';
  // import ReactMarkdown from 'react-markdown';
  // import text from './content.md';

  // export default function () {
  //   return <ReactMarkdown source={text} htmlMode={'raw'} />;
  // }
  // `, (err) => {
  //   if (err) throw err;
  // });
  });

  // blogs.js

  // string += `export default [${titles}]`;
  // fs.writeFile('./js/resources/blogs.js', string, (err) => {
  //   if (err) throw err;
  //   console.log('blogs saved');
  // });
};
