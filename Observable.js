const Observable = class
{
  #executor
  constructor(executor = null)
  {
    if(executor != null && typeof(executor) == 'function')
    {
      // save the method into a private variable
      this.#executor = executor;
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
        sub = {next: subscriber.next};
        
        if(subscriber.error != null)
        {
          sub.error = subscriber.error;
        }
        else
        {
          // dub method in case its used
          sub.error = () => {};
        }
        
        if(subscriber.complete != null)
        {
          sub.complete = subscriber.complete;
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
    }
  }
};

const rxjs = {Observable:{create:(subscriber) => {
  return new Observable(subscriber);
}}};