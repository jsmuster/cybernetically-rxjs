class RxObservable
{
  #executor
  #destroyer

  #pipes = null

  #next

  #defaultState

  constructor(executor = null, destroyer = null, defscope = {})
  {
    // clone the scope object
    this.#defaultState = defscope;

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

  #processNext(cfg, val)
  {
    let pipes = this.#pipes;

    if(pipes != null && pipes.length > 0)
    {
      let count = 0;
      let result;

      if(pipes.length == 1)
      {
        result = pipes[0].call(cfg.scope, val, 0);
      }
      else
      {
        for(const pipe of pipes)
        {
          result = pipe.call(cfg.scope, val, count);

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
            cfg.next(val);
          }
          catch(e) {
            console.log("err", e.stack != null ? e.stack.toString() : e)
          }
        }
      }
    }
    else
    {
      cfg.next(val);
    }
  }

  /* this method is used to generate a subscriber object with next, error and complete methods */
  getSubscriber(subscriber, error, complete)
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

    return {sub, currScope};
  }

  subscribe(subscriber, error, complete)
  {

    if(subscriber != null)
    {
      let {sub, currScope} = this.getSubscriber(subscriber, error, complete);

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

class RxSubscription
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

class rxSubject extends RxObservable
{
  closed = false;
  stopped = false;
  error = false;

  #subscriptions = [];

  subscribe(subscriber, error, complete)
  {
    //let {sub, currScope} = this.getSubscriber(subscriber, error, complete);

    this.#subscriptions.push(this.getSubscriber(subscriber, error, complete));
  }

  /* unsubscribes all subscriptions from the Subject */
  unsubscribe()
  {
    this.closed = true;
    this.stopped = true;

    this.#subscriptions = null;
    this.#subscriptions = [];
  }

  error(msg)
  {

    if(this.closed == false && this.stopped == false)
    {
      this.error = true;
      this.stopped = true;

      let subs = this.#subscriptions;

      for(const subCfg of subs)
      {
        const {sub, currScope} = subCfg;

        sub.error(msg);
      }
    }

  }

  complete()
  {
    if(this.closed == false && this.stopped == false)
    {
      this.stopped = true;

      let subs = this.#subscriptions;

      for(const subCfg of subs)
      {
        const {sub, currScope} = subCfg;

        sub.complete();
      }

      this.#subscriptions = null;
      this.#subscriptions = [];
    }
  }

  next(value)
  {
    if(this.closed == false && this.stopped == false)
    {
      let subs = this.#subscriptions;

      for(const subCfg of subs)
      {
        const {sub, currScope} = subCfg;

        sub.next(value);
      }
    }
  }

} /* end of rxSubject */

const rxjs = {Observable:{create:(subscriber, destroyer, scope) => {
  return new RxObservable(subscriber, destroyer, scope);
}},
Subject: rxSubject};

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

  // this gets cloned when observable is instantiated
  let defaultScope = {time:time};

      // interval id to be used with subscription to unsubscribe
      defaultScope.iid = null;

      // number that gets incremented every time
      defaultScope.num = 0;

  // create a subscription object that is used to unsubscribe and clear the interval
  return rxjs.Observable.create(function subscriber(subscriber) {
    
    this.iid = setInterval( () => {

      subscriber.next(this.num++);

    }, this.time);

  }, function unsubscriber () {

    clearInterval(this.iid);

  }, defaultScope);

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
  let efnfilter = function (val, index) {

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
  let efnmap = function(val, index) {
    
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

