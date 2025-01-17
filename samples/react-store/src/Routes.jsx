import React from 'react';
import { BrowserRouter as Router, Route, Redirect } from 'react-router-dom';

import CustomersContainer from './customers/CustomersContainer';
import CustomerEdit from './customers/CustomerEdit';
import OrdersContainer from './orders/OrdersContainer';

const Routes = () => (
  <Router>
    <div>
      <Route exact path="/"
        render={() => <Redirect exact from="/" to="/customers" />}
      />
      <Route exact path="/customers" component={CustomersContainer} />
      <Route path="/customers/:id" component={CustomerEdit} />
      <Route path="/orders/:id" component={OrdersContainer} />
    </div>
  </Router>
);
export default Routes;
