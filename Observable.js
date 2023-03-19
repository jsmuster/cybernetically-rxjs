const RxObservable = class
{
  #executor
  #destroyer

  #pipes = null

  #next

  #defaultState

  constructor(executor = null, destroyer = null, scope = {})
  {
    // clone the scope object
    this.#defaultState = scope;

    if(executor != null && typeof(executor) == 'function')
    {
      // save the method into a private variable
      this.#executor = executor;
    }

    if(destroyer != null && typeof(destroyer) == 'function')
    {
      // save the method into a private variable
      this.#destroyer = destroyer;
    }
  }

  #processNext(currScope, val)
  {
    let pipes = this.#pipes;

    if(pipes != null && pipes.length > 0)
    {
      let count = 0;
      let result;

      if(pipes.length == 1)
      {
        result = pipes[0](val, 0);
      }
      else
      {
        for(const pipe of pipes)
        {
          result = pipe.call(currScope.scope, val);

          if(result.done == true)
          {
            break;
          }
          else
          {
            val = result.value;
          }

          count++;
        };

        if(count == pipes.length)
        {
          try
          {
            currScope.next(val);
          }
          catch(e) {
            console.log("err", e.stack != null ? e.stack.toString() : e)
          }
        }
      }
    }
    else
    {
      this.#next(val);
    }
  }

  subscribe(subscriber, error, complete)
  {
    if(subscriber != null)
    {
      let currScope = Object.assign({}, this.#defaultState);

      let sub;
      
      if(typeof(subscriber) == 'function')
      {
        //this.#next = subscriber;

        sub = {next: this.#processNext.bind(this, {scope:currScope, next: subscriber})};

        if(error != null)
        {
          sub.error = error;
        }
        else
        {
          // dub method in case its used
          sub.error = () => {};
        }
        
        if(complete != null)
        {
          sub.complete = complete;
        }
        else
        {
          // dub method in case its used
          sub.complete = () => {};
        }
      }
      else if(typeof(subscriber) == 'object' && subscriber.next != null)
      {
        let next = (val) => {
          //console.log("*n 1")
          subscriber.next.call(subscriber, val);
        };

        sub = {next: this.#processNext.bind(this, {scope: currScope, next: next})};
        
        if(subscriber.error != null)
        {

          sub.error = () => {
            subscriber.error.call(subscriber);
          };

        }
        else
        {
          // dub method in case its used
          sub.error = () => {};
        }
        
        if(subscriber.complete != null)
        {
          sub.complete = () => {
            subscriber.complete.call(subscriber);
          };
        }
        else
        {
          // dub method in case its used
          sub.complete = () => {};
        }
      }

      try
      {
        let currExecutor = this.#executor.bind(currScope);

        currExecutor(sub);
      }
      catch(e) {
      }

      if(this.#destroyer != null)
      {
        let currDestroyer = this.#destroyer.bind(currScope);
        let subscription = new RxSubscription(currDestroyer);

        return subscription;
      }
    }

  }

  pipe(...fns)
  {
    if(fns != null && fns.length > 0)
    {
      //this.#pipes = new RxPipeable(fns);
      this.#pipes = fns;
    }

    return this;
  }

};

const RxSubscription = class
{
  #executor
  constructor(executor = null)
  {
    if(executor != null && typeof(executor) == 'function')
    {
      // save the method into a private variable, to triger later in unsubscribe
      this.#executor = executor;
    }
  }
  unsubscribe()
  {
    if(this.#executor != null)
    {
      try
      {
        this.#executor();
      }
      catch(e)
      {
        console.log("Error unsubscribing ", e.stack != null ? e.stack : e);
      }
    }
  }
};

const rxjs = {Observable:{create:(subscriber, destroyer, scope) => {
  return new RxObservable(subscriber, destroyer, scope);
}}};

/* of Operator */
rxjs.of = (...args) => {

  return rxjs.Observable.create((subscriber) => {

    args.forEach((val) => {
      subscriber.next(val);
    });
    
    subscriber.complete();
  });

};

/* interval Operator */
rxjs.interval = (time) => {

  let scope = {time:time};

      // interval id to be used with subscription to unsubscribe
      scope.iid = null;

      // number that gets incremented every time
      scope.num = 0;

  // create a subscription object that is used to unsubscribe and clear the interval
  return rxjs.Observable.create(function executor(subscriber) {
    
    this.iid = setInterval( () => {

      subscriber.next(this.num++);

    }, this.time);

  }, function destroyer () {

    clearInterval(this.iid);

  }, scope);

};

/* range Operator */
rxjs.range = (from, count) => {

  return rxjs.Observable.create((subscriber) => {

    for(let i = from, l = from + count; i < l; i++)
    {
      subscriber.next(i);
    }
    
    subscriber.complete();
  });

};

/* rxjs Operators */
rxjs.operators = {};

/* filter - filters values emitted by the source Observable */
/* @predicate function evaluates each value emitted. If 'true' is returned, the value is emitted into the chain */
/* @thisArg an optional argument, which becomes 'this' withint he predicate */
rxjs.operators.filter = (predicate, thisArg) => {
  
  let ret;
  /* exec function */
  let efnfilter = (val, index) => {

    ret = predicate(val, index);

    if(ret === true)
    {
      return {value: val, done: false};
    }
    else
    {
      /* ends the iterator sequence here */
      return {value: undefined, done: true};
    }
  };

  if(thisArg != null)
  {
    return efnfilter.bind(thisArg);
  }
  else
  {
    return efnfilter;
  }
};

/* map - a function that runs for every value emitted by the source, it transforms the emitted value */
rxjs.operators.map = (transformer, thisArg) => {
  
  let ret;

  /* map function */
  let efnmap = (val, index) => {
    
    ret = transformer(val, index);
    
    return {value: ret, done: false};
  };

  if(thisArg != null)
  {
    return efnmap.bind(thisArg);
  }
  else
  {
    return efnmap;
  }

};

/* emitted by the source Observable, or all of the values from the source */
rxjs.operators.take = function take(count) {
  
  let efntake;

  if(count > 0)
  {
    let seen = 0;

    /* map function */
    efntake = function (val) {

      if(this.seen == undefined) this.seen = 0;

      if(++this.seen <= count)
      {
        return {value: val, done: false};
      }
      else
      {
        return {done: true};
      }

    };

  }
  else
  {
    efntake = (val) => {
      return {done: true};
    };
  }

  return efntake;

};

module.exports = rxjs;

