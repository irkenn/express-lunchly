/** Customer for Lunchly */

const db = require("../db");
const Reservation = require("./reservation");
const slugify = require('slugify');

/** Customer of the restaurant. */

class Customer {
  constructor({ id, firstName, lastName, phone, notes, amount }) {
    this.id = id;
    this.firstName = firstName;
    this.lastName = lastName;
    this.phone = phone;
    this.notes = notes;
    this.fullName = `${firstName}-${lastName}`;
    this.amount = amount;
  }

  /** find all customers. */

  static async all() {
    const results = await db.query(
      `SELECT id, 
         first_name AS "firstName",  
         last_name AS "lastName", 
         phone, 
         notes
       FROM customers
       ORDER BY last_name, first_name`
    );
    return results.rows.map(c => new Customer(c));
  }

  /** get a customer by ID. */

  static async get(id) {
    const results = await db.query(
      `SELECT id, 
         first_name AS "firstName",  
         last_name AS "lastName", 
         phone, 
         notes 
        FROM customers WHERE id = $1`,
      [id]
    );

    const customer = results.rows[0];

    if (customer === undefined) {
      const err = new Error(`No such customer: ${id}`);
      err.status = 404;
      throw err;
    }

    return new Customer(customer);
  }

  /** get all reservations for this customer. */

  async getReservations() {
    return await Reservation.getReservationsForCustomer(this.id);
  }

  static async search(keyword){
    /** The keyword is cleaned to separate first and last name and get rid of special 
     * character like $#&/, etc. ILIKE is used in the query which is case insensitive */
    let arr = [];
    arr = keyword.split(" ");
    arr = arr.map(k => slugify(k, {remove:/[*+~.,%=?¿()#@!¡1234567890]/g}).toLowerCase())
    
    const results = await db.query(
      `SELECT id,  
         first_name AS "firstName",  
         last_name AS "lastName", 
         phone, 
         notes
       FROM customers 
       WHERE first_name ILIKE $1 
        OR last_name ILIKE $1 
        OR first_name ILIKE $2 
        OR last_name ILIKE $2 
       ORDER BY last_name, first_name`
      , [ `%${ arr[0] }%`, `%${ arr[1] }%`]);
      
      if( results.rows[0] === undefined){
        const err = new Error(`Your keywords didn't produced any match: ${keyword}`);
        err.status = 404;
        throw err;
      }
      return results.rows.map(c => new Customer(c));
  }

  static async best10(){
    const results = await db.query(
      `SELECT customers.id,  
        first_name AS "firstName",  
        last_name AS "lastName", 
        phone, 
        customers.notes,
        count(reservations.customer_id) AS amount
      FROM customers 
      JOIN reservations ON customers.id = reservations.customer_id
      GROUP BY customers.id
      ORDER BY amount DESC
      LIMIT 10; 
      `);
      return results.rows.map(c => new Customer(c));

  }

  async save() {
    if (this.id === undefined) {
      const result = await db.query(
        `INSERT INTO customers (first_name, last_name, phone, notes)
             VALUES ($1, $2, $3, $4)
             RETURNING id`,
        [this.firstName, this.lastName, this.phone, this.notes]
      );
      this.id = result.rows[0].id;
    } else {
      await db.query(
        `UPDATE customers SET first_name=$1, last_name=$2, phone=$3, notes=$4
             WHERE id=$5`,
        [this.firstName, this.lastName, this.phone, this.notes, this.id]
      );
    }
  }

}

module.exports = Customer;
