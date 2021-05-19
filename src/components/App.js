import '../styles/App.css';
import { faSun, faCaretDown, faCheckSquare, faSquare, faHeart, faComment } from '@fortawesome/free-solid-svg-icons';
import { Fragment, useEffect, useState } from 'react';
import { library } from '@fortawesome/fontawesome-svg-core';
import firebase from '../config/firebase';
import Form from './Form';
import Header from './Header';
import getFormattedDate from '../utilities/getFormattedDate';
import Message from './Message';
import MessageBoardList from './MessageBoardList'
import MessageBoardListItem from './MessageBoardListItem';

function App() {
  // adding fontawesome icons globally
  library.add(faSun, faCaretDown, faCheckSquare, faSquare, faHeart, faComment);

  // useState declarations
  const [ messages, setMessages ] = useState([]);
  const [ boards, setBoards ] = useState([]);
  const [ currentBoard, setCurrentBoard ] = useState(`-M_qnb3Aah2p0BDqMmgq`);
  const [ currentBoardName, setCurrentBoardName] = useState('Public');
  const [ newBoardInput, setNewBoardInput ] = useState('');
  const [ anonymousChecked, setAnonymousChecked ] = useState(false);
  const [ messagesWithAnonChecked, setMessagesWithAnonChecked ] = useState([]);
  const [ comments, setComments ] = useState([]);
  const [ commentFormExpanded, setCommentFormExpanded ] = useState([]);
  const [ mobileExpanded, setMobileExpanded ] = useState(false);

  // selectors
  const formNameInput = document.getElementById('name');
  const formAnonymousCheck = document.getElementById('anonymous');
  const formMessageInput = document.getElementById('message');
  const formNewBoard = document.getElementById('boardName');

  // database references
  const dbRef = firebase.database().ref();
  const currentMessagesRef = firebase.database().ref(`${currentBoard}/messages`);
  const currentCommentsRef = firebase.database().ref(`${currentBoard}/comments`);

  // functions
  // 
  const expandComments = () => {
    setMobileExpanded(!mobileExpanded);
  }

  // handles new message submit in the new message form
  const handleSubmit = (event) => {
    // prevent reloading the page
    event.preventDefault();
    
    // grab values from the form and format dates
    const submittedMessage = formMessageInput.value;
    const submittedName = formAnonymousCheck.checked ? "Anonymous" : formNameInput.value;
    const newDate = new Date();
    const submittedDate = getFormattedDate(newDate);

    // update the database
    currentMessagesRef.push({message: submittedMessage, name: submittedName, date: submittedDate, likes: 0, clicks: 0 });

    // set focus on form again
    formNameInput.focus();
  }

  // handles hitting enter when focused on anonymous label/checkbox
  const handleEnterAnonymous = ({ key }) => {
    if (key === 'Enter') {
      handleAnonCheck();
    }
  }

  // handles liking a message on any board
  const handleLike = async (key) => {
    // retrieve number of likes from database
    const dbResponse = await currentMessagesRef.child(`${key}`).get(`likes`);
    const message = dbResponse.toJSON();
    const { likes } = message;

    // update the likes value in the database
    currentMessagesRef.child(`${key}`).update({likes: (likes + 1)});
  }

  // handles the changing of message boards
  const handleBoardChange = async (key) => {
    // set the current board state
    setCurrentBoard(key);

    // get the board name from the 
    const dbResponse = await dbRef.child(key).get(`topicName`);
    const board = await dbResponse.toJSON();
    const { topicName } = board;

    // set the board name state for the Latest Messages heading
    setCurrentBoardName(topicName);
    console.log('done');
  }

  // handles change in value of new board input
  const handleNewBoardChange = ({ target }) => {
    setNewBoardInput(target.value);
  }

  // handles submit of new board form
  const handleNewBoardSubmit = (event) => {
    // prevent page from reloading
    event.preventDefault();

    // store the new baord name
    const submittedBoardName = formNewBoard.value;

    // update the userInput state
    setNewBoardInput('');

    // update the database
    dbRef.push({ topicName: submittedBoardName, messages: {} });
  }

  const handleAnonCheck = async (comment, key) => {
    console.log('check');
    if (comment === true) {
      // setting new state
      const newState = (
        messagesWithAnonChecked.indexOf(key) === -1 
        ? [key] 
        : []
      );
      console.log('new state',  newState);
      setMessagesWithAnonChecked(newState);
    } else if (!comment) {
      if (!anonymousChecked) {
        setAnonymousChecked(true)
      } else {
        setAnonymousChecked(false)
      }
    }
  }

  // handles new comment being submitted on a message
  const handleNewComment = (event, key, nameInputId, anonCheckId, messageInputId, ) => {
    // prevent reloading the page
    event.preventDefault();

    console.log(document.getElementById(nameInputId).value);
    console.log(document.getElementById(anonCheckId).checked);
    console.log(document.getElementById(messageInputId).value);

    // grab values from the form and format dates
    const submittedMessage = document.getElementById(messageInputId).value;
    const submittedName = document.getElementById(anonCheckId).checked ? "Anonymous" : document.getElementById(nameInputId).value;
    const newDate = new Date();
    const submittedDate = getFormattedDate(newDate);

    // update the database
    dbRef.child(`${currentBoard}/comments`).push({ name: submittedName, date: submittedDate, message: submittedMessage, likes: 0, associatedPost: key });
  }

  // handles adding a new like onto a comment
  const handleCommentLike = async (key) => {
    // retrieve number of likes from database
    const dbResponse = await currentCommentsRef.child(`${key}`).get(`likes`);
    const message = dbResponse.toJSON();
    const { likes } = message;

    // update the likes value in the database
    currentCommentsRef.child(`${key}`).update({ likes: (likes + 1) });
  }

  // useEffect hooks
  // boards update
  useEffect(() => {
    const dbRef = firebase.database().ref();
    dbRef.on("value", (snapshot) => {
      // initialize new state
      const newState = [];
      const data = snapshot.val();

      // loop through data and add each board to new state
      for (let key in data) {
        newState.push({key: key, name: data[key]});
      }
      
      // set the boards state 
      setBoards(newState);
    })

    const currentBoardRef = firebase.database().ref(`${currentBoard}`);
    currentBoardRef.on("value", (snapshot) => {
      // initialize new state
      const newState = [];
      const boardData = snapshot.val();
      const { messages } = boardData;

      // loop through data and add to new state IN REVERSE (newest show at top)
      for (let key in messages) {
        newState.unshift({ key: key, details: messages[key] })
      }

      // set the messages state
      setMessages(newState);
    })

    const currentCommentsRef = firebase.database().ref(`${currentBoard}/comments`);
    currentCommentsRef.on("value", (snapshot) => {
      // initialize new state
      const newState = [];
      const data = snapshot.val();

      // loop through data and add to new state IN REVERSE (newest show at top)
      for (let key in data) {
        newState.unshift({ key: key, details: data[key] })
      };

      // set the comments state
      setComments(newState);
    })
  }, [currentBoard, commentFormExpanded])

  // page elements
  const boardsList = boards.map((board) => {
    return (
      <MessageBoardListItem
        key={board.key} 
        boardName={board} 
        clickEvent={handleBoardChange}
        collapseList={expandComments}
      />
    )
  })

  const messagesList = messages.map((messageObject) => {
    // pull related comments for each message
    const relatedComments = comments.filter((commentObject) => {
      const { details: { associatedPost } } = commentObject;
      return associatedPost === messageObject.key
    })
    // reverse the order of comments, oldest first
    relatedComments.reverse();
    return (
      <Message 
        key={messageObject.key} 
        content={messageObject} 
        updateLikes={handleLike}
        formSubmitEventHandler={handleNewComment}
        postComments={relatedComments}
        updateCommentLikes={handleCommentLike}
        switchCheckbox={handleAnonCheck}
        messagesRef={currentMessagesRef}
        isAnonChecked={messagesWithAnonChecked}
        isCommentFormExpanded={commentFormExpanded}
        setIsCommentFormExpanded={setCommentFormExpanded}
      />
    )
  })

  // App return
  return (
    <Fragment>
      {/* header component */}
      <Header />
      <main>
        <div className="wrapper mainContainer">
          {/* side bar with list of message boards */}
          <MessageBoardList 
            addNewBoard={handleNewBoardSubmit}
            newBoardValue={newBoardInput}
            updateNewBoardValue={handleNewBoardChange}
            boardsList={boardsList}
            handleClick={expandComments}
            isMobileExpanded={mobileExpanded}
          />

          {/* new message form */}
          <div className="messageBoard">
            <Form
              submitEvent={handleSubmit}
              switchCheckbox={handleAnonCheck}
              isChecked={anonymousChecked}
              keydownCheckbox={handleEnterAnonymous}
            />

            {/* message board */}
            <section className="messagesBoardContainer">
              <h3 className="messagesListHeading">Latest Messages on {currentBoardName} Board</h3>
              <ul>
                {messagesList}
              </ul>
            </section>
          </div>
        </div>
        {/* wrapper ended */}
      </main>
    </Fragment>
  )
}

export default App;