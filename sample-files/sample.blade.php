@extends('quiz.layout')
@section('page-type','quiz-question')
@section('title','Quiz: AML/TF Training')
@section('theme-name','bridge')

@section('header')

  <ul class="social-links">
    <li><h3>Share this quiz:</h3></li>
    <li><a class="icon-facebook">facebook</a></li>
    <li><a class="icon-twitter">twitter</a></li>
    <li><a class="icon-share">share</a></li>
  </ul>
  <div class="quiz-progress-track-wrapper">
    <ul class="quiz-progress-track">

      @for ($i = 1; $i <= $quizzes->questions->count(); $i++)
        @if ($i <= $questions->position )
          <li class="is-finished">{{ $i }}</li>
        @else
          <li>{{ $i }}</li>
        @endif
      @endfor
    </ul>
  </div>
@stop

@section('content')
  <div class="page-body" id="page-body"><!-- Im new here -->
    <header class="question-body-header">
      <div class="content">
        <span class="quiz-title-tag"><strong>Quiz</strong> | {{ $quizzes->title }}</span>
      </div>
    </header>

    <section id="question-section" class="question-section" data-question-type="multiple-choices">
      <div class="content">
        <div class="question-stem">
          <span class="question-index"><small>Question </small>{{ $questions->position }} of {{ $quizzes->questions->count() }}</span>
          <h2 class="question-stem-title">{!! $questions->question !!}</h2>
        </div>


        <!-- <form class="question-answers" method="POST" action="/store"> -->
        <form onsubmit="nextbtn.disabled = true; return true;" class="question-answers" method="POST" action="/quiz/{{ $quizzes->slug }}/{{ $questions->slug }}/store">
        {{ csrf_field() }}

          <!-- <textarea name="body" class="form-control"></textarea> -->

          <input type="hidden" name="quiz_id" id="quiz_id" value="{{ $quizzes->id }}">
          <input type="hidden" name="question_id" id="question_id" value="{{ $questions->id }}">
          <input type="hidden" name="username" id="username" value="{{ Auth::user()->username }}">
          <input type="hidden" name="success" id="success" value="1">

          @if( $questions->id !== 1 )
          <input type="hidden" name="attempt" id="attempt" value="{{ $attempt = DB::table('results')->where('username', Auth::user()->username)->max('attempt') }}">
          @endif

          <?php $letter = "A"; ?>
          @foreach($answers as $answer)

          <div class="answer-entry">
            <input type="radio" name="answer" value="{{ $answer->id }}" id="answer-{{ $answer->id }}">
            {{-- This 'is-correct' class is to be added by javascript *only* when user selects *any* answer. --}}
            <label for="answer-{{ $answer->id }}">
              <span class="answer-key">{{ $letter }}</span>
              <span class="answer-content">{{ $answer->body }}</span>
            </label>
          </div>

          <?php $letter++ ; ?>
          @endforeach

          <br>

          <!-- <button class="btn" type="submit">Submit</button> -->


          <div class="quiz-nav-wrapper">
            <!-- <a class="btn-banner" href="/summary/quiz">Next question</a> -->
            <button name = "nextbtn" class="btn-banner" type="submit" v-show="">
              @if ($questions->id !== $quizzes->questions->count())
                Next Question
              @else
                Finish Quiz
              @endif
            </button>
            {{-- a 'is-disabled' class is added to the button when there is no answer chosen. clicking on the button would display a prompt asking if user want to skip the question. --}}
            {{-- <ul class="question-nav-options">
              <li><a class="btn-subtle">Previous Question</a></li>
              <li><a class="btn-subtle">Skip</a></li>
            </ul> --}}
          </div>

        </form>


        <!-- <div class="answer-explanation">
          <p class="selected-answer-manifested">You selected answer C.</p>
          <h3 class="correct-answer-manifested">Correct Answer: A</h3>
          <p>When the answer is wrong, an explanation can be given here.</p>
          <p>Optionally we can display the wrong answers and expalantions at the end of the quiz with the results.</p>
        </div> -->




    </section>
  </div>
@stop
