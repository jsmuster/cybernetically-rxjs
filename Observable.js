const RxObservable = class
{
  #executor
  #destroyer
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
        sub = {next: subscriber};

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
        sub = {next: (val) => {
          subscriber.next.call(subscriber, val);
        }};
        
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
  pipe()
  {
    
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

rxjs.operators.filter = () => {
  
};

rxjs.operators.map = () => {
  
};



