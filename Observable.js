const RxObservable = class
{
  #executor
  #destroyer

  #pipes = null

  #next

  #processNext(val)
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
          result = pipe(val);

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
            this.#next(val);
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

  constructor(executor = null, destroyer = null)
  {
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

  subscribe(subscriber, error, complete)
  {
    if(subscriber != null)
    {
      let sub;
    
      if(typeof(subscriber) == 'function')
      {
        this.#next = subscriber;

        sub = {next: this.#processNext.bind(this)};

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
        this.#next = (val) => {
          //console.log("*n 1")
          subscriber.next.call(subscriber, val);
        };

        sub = {next: this.#processNext};
        
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
        this.#executor(sub);
      }
      catch(e) {
      }

      if(this.#destroyer != null)
      {
        let subscription = new RxSubscription(this.#destroyer);

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

const rxjs = {Observable:{create:(subscriber, destroyer) => {
  return new RxObservable(subscriber, destroyer);
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

  // interval id to be used with subscription to unsubscribe
  let iid;

  // number that gets incremented every time
  let num = 0;

  // create a subscription object that is used to unsubscribe and clear the interval
  return rxjs.Observable.create((subscriber) => {

    iid = setInterval( () => {

      subscriber.next(num++);

    }, time);

  }, () => {
    clearInterval(iid);
  });

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
rxjs.operators.take = (count) => {
  
  let efntake;

  if(count > 0)
  {
    let seen = 0;

    /* map function */
    efntake = (val) => {

      if(++seen <= count)
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

