import { Button } from '@chakra-ui/button';
import { Box, Flex, Heading, Text } from '@chakra-ui/layout';
import { Spinner } from '@chakra-ui/spinner';
import React, { useEffect, useRef, useState } from 'react';
import { debounce } from '../../utils';
import { useDebouncedCallback } from '../../utils/useDebouncedCallback';

function scrollToContent(element, container, offsetValue = 0) {
  // container.scrollTop = element.offsetTop - offsetValue;
  if (!container) return;
  if (element.offsetTop > container.scrollTop) {
    const offsetBottom = element.offsetTop + element.offsetHeight;
    const scrollBottom = container.scrollTop + container.offsetHeight / 2;
    if (offsetBottom > scrollBottom) {
      container.scrollTop = offsetBottom - container.offsetHeight + offsetValue;
    }
  }
}

function getTimeStamp(start) {
  const startValue = Math.floor(start);
  let minute = Math.floor(startValue / 60);
  let seconds = startValue % 60;
  return `${('00' + minute).substr(-2)}:${('00' + seconds).substr(-2)}`;
}

export default function Transctipt({
  tx: transcript,
  subtitle: st,
  video,
  onEdit,
  transcribeContainerRef,
}) {
  const [subtitle, setSubtitle] = useState(st);
  useEffect(() => setSubtitle(st), [st]);

  function editSubtitle(line, chunkIdx) {
    let edit = [...subtitle];
    edit[chunkIdx].line = line;
    setSubtitle(edit);
    onEdit(edit);
  }

  const handleSubtitleEdit = useDebouncedCallback(
    (line, chunkIdx) => editSubtitle(line, chunkIdx),
    400
  );

  // function handleOnEnter(e, chunkIdx) {
  //   e.preventDefault();

  //   let newText = e.target.innerText.split('\n')[0];

  //   const wordSpans = e.target.lastChild.children;
  //   let words = Array.from(wordSpans).map(
  //     span => subtitle[chunkIdx].words[span.dataset.wordidx]
  //   );
  //   let line = {
  //     line: words.map(i => i.word).join(''),
  //     start: words[0].start,
  //     end: words[0].end,
  //     words: words,
  //   };

  //   let editSubtitle = [...subtitle];
  //   editSubtitle.splice(chunkIdx + 1, 0, line);

  //   editSubtitle[chunkIdx].line = newText;
  //   editSubtitle[chunkIdx].words = editSubtitle[chunkIdx].words.filter(
  //     (i, idx) => idx >= wordSpans[0].dataset.wordidx
  //   );

  //   setSubtitle(editSubtitle);
  // }

  // const [transcript, setTranscript] = useState(tx);
  // const transcribeContainerRef = useRef();
  function onTimeUpdate() {
    const t = video.currentTime;

    let found = false;
    transcript.segments.forEach(seg => {
      seg.wdlist.forEach(({ wordRef }) => {
        if (wordRef) wordRef.style.background = 'transparent';
      });

      if (seg.end < t) {
        return;
      }
      if (found) {
        return;
      }

      seg.wdlist.forEach(({ wordRef, end }) => {
        if (found) {
          return;
        }
        if (!wordRef) {
          return;
        }

        if (end - 0.1 > t) {
          wordRef.style.backgroundColor = 'rgba(251, 232, 177, 0.8)';
          wordRef.style.borderRadius = '5px';
          wordRef.style.transitionProperty = 'left, top, width, height';
          wordRef.style.transitionDuration = '0.1s';

          scrollToContent(wordRef, transcribeContainerRef?.current, 24);

          found = true;
        }
      });
    });
  }

  useEffect(() => {
    if (transcript && video) {
      video.addEventListener('timeupdate', onTimeUpdate, false);
      return () => {
        video.removeEventListener('timeupdate', onTimeUpdate, false);
      };
    }
  }, [transcript, video]);

  if (!transcript || !subtitle)
    return (
      <Flex justifyContent="center" alignItems="center" h="300px">
        <Spinner />
      </Flex>
    );

  return (
    <Box>
      {subtitle.map((chunk, chunkIdx) => (
        <Flex
          px="4"
          py="2"
          fontSize="18"
          alignItems="baseline"
          key={chunkIdx}
          onClick={() => {
            video.currentTime = chunk.words[0].start;
          }}
        >
          <Box pr="4" fontSize="sm">
            {getTimeStamp(chunk.start)}
          </Box>
          <Box
            contentEditable
            suppressContentEditableWarning
            onInput={e => handleSubtitleEdit(e.target.innerText, chunkIdx)}
            // onKeyUp={e => {
            //   if (e.key === 'Enter') {
            //     e.preventDefault();
            //     console.log(e.target.lastChild.children);
            //     handleOnEnter(e, chunkIdx);
            //   }
            // }}
            // onKeyDown={e => console.log(e.key)}
          >
            {chunk.words.map((word, wordIdx) => (
              <span
                key={wordIdx}
                data-wordidx={wordIdx}
                onClick={e => {
                  video.currentTime = word.start;
                  e.stopPropagation();
                }}
                ref={wordRef => {
                  word.wordRef = wordRef;
                }}
              >
                {word.word}
              </span>
            ))}
          </Box>
        </Flex>
      ))}
    </Box>
  );
}

//   return (
//     <Box>
//       {transcript.segments.map((segment, segmentIdx) => (
//         <Box key={segmentIdx} ref={transcribeContainerRef} py={2}>
//           <Heading size="md">{segment.speaker_name}</Heading>
//           {/* <Box>
//             {segment.wdlist.map((word, wordIdx) => (
//               <span
//                 key={wordIdx}
//                 onInput={e =>
//                   onWordChange(segmentIdx, wordIdx, e.target.innerText)
//                 }
//                 ref={wordRef => {
//                   word.wordRef = wordRef;
//                 }}
//               >
//                 {word.word}
//               </span>
//             ))}
//           </Box> */}

//           <Box
//           // contentEditable
//           // suppressContentEditableWarning
//           // onInput={e => console.log('onInput', e)}
//           >
//             {subtitle[segmentIdx].map((chunk, chunkIdx) => (
//               <Text
//                 as="span"
//                 key={chunkIdx}
//                 contentEditable
//                 suppressContentEditableWarning
//                 onInput={e => onEdit(e.target.innerText, segmentIdx, chunkIdx)}
//               >
//                 {chunk.words.map((word, wordIdx) => (
//                   <span
//                     key={wordIdx}
//                     onBlur={e => console.log('changed')}
//                     onClick={e => video.pause()}
//                     // onInput={e =>
//                     //   onWordChange(segmentIdx, wordIdx, e.target.innerText)
//                     // }
//                     ref={wordRef => {
//                       word.wordRef = wordRef;
//                     }}
//                   >
//                     {word.word}
//                   </span>
//                 ))}
//               </Text>
//             ))}
//           </Box>
//         </Box>
//       ))}
//     </Box>
//   );
// }
