import React from 'react';
import ReactMarkdown from 'react-markdown';
import text from './content.md';

export default function () {
  return <ReactMarkdown source={text} escapeHtml={false} />;
}
