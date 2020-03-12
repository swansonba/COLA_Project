var passport = require('passport');
var bcrypt = require('bcrypt');
var LocalStrategy = require('passport-local').Strategy;

require('../server.js');
const saltRounds = 10;

var mysql = require('../dbcon.js');
/* name: queryDB
   preconditions: sql contains string sql query
                  values is array of arguments for sql statement
		  mysql is connection to db
   postconditions: returns Promise. Upon successful execution of sql statement
                   Promise resolves with results, else rejects with error message.
   description: queryDB is a helper function for querying database.
*/
function queryDB(sql, values, mysql) {
	return new Promise((resolve, reject) => {
		mysql.pool.query(sql, values, (err, results, fields) => {
			if (err) {
				console.log('db query rejecting');
				reject(err);
			} else resolve(results);
		});
	});
}

module.exports = {

    /* place db functions here - see example below */
    /* addUser
     * takes email password, date as parameters
     *  and inserts a new user into the DB with hashed password
     */
    add_user: function (email, pwd, now, res, req) {
	bcrypt.hash(pwd, saltRounds, function (err, hash) {
	    var sql = "INSERT INTO user (`email`, `password`, `created`, `modified`) VALUES (?, ?, ?, ?)"
	    var values = [email, hash, now, now];
	    queryDB(sql, values, mysql).then((message) => {
		console.log(message);
		sql = "SELECT id from user WHERE id= LAST_INSERT_ID()"
		values = 'LAST_INSERT_ID()'
		queryDB(sql, values, mysql).then(message => {
			console.log(message);
		    const user_id = parseInt(message[0].id);
			console.log(user_id);
		    req.login(user_id, function (err) {
			res.redirect('subscriptions');
		    })

		})

	    });
	})
    },


    authenticationMiddleware: function () {
	return (req, res, next) => {
	    console.log(`req.session.passport.user: ${JSON.stringify(req.session.passport)}`);
	    if (req.isAuthenticated()) return next();
	    res.redirect('/login');
	}
    },
    /*******************************************************************/
    /********************* COLA RATE SCRIPT QUERIES ********************/
    /*******************************************************************/
    /* name: add_cola_rates
       preconditions: scraped contains array of objects of the form 
       postconditions: returns Promise that doesnt resolve until all
       have been successfully added to db. 
       description: This function should only need to be called to 
       initialize db. All cola rates contained in scraped
       are inserted into db. If any inserts fail, error 
       message printed and function returns immediately.
    */
    add_cola_rates: function (scraped) {
	return new Promise((resolve, reject) => {
	    let queries = [];
	    const sql = `INSERT INTO COLARates (country, post, allowance, last_modified) VALUES (?, ?, ?, now())`
	    scraped.forEach(entry => {
		let values = [entry.country, entry.post, entry.allowance];
		queries.push(queryDB(sql, values, mysql));
	    })
	    Promise.all(queries)
		.then((res) => resolve(res))
		.catch(err => {
		    console.log(err);
		    return;
		})
	})
    },
    /* name: add_cola_rate
       preconditions: scraped contains array of objects of the form 
       postconditions: returns Promise that doesnt resolve until all
       have been successfully added to db. 
       description: This function should only need to be called to 
       initialize db. All cola rates contained in scraped
       are inserted into db. If any inserts fail, error 
       message printed and function returns immediately.
    */
    add_cola_rate: function (country, post, allowance) {
	return new Promise((resolve, reject) => {
	    const sql = `INSERT INTO COLARates (country, post, allowance, last_modified) VALUES (?, ?, ?, now())`
	    let values = [country, post, allowance];
	    queryDB(sql, values, mysql)
		.then(res => {
		    resolve(res)
		})
		.catch(err => {
		    console.log(err);
		    reject(err)
		})
	})
    },
    /* name: get_cola_rate
       preconditions: country is string name of country which we need cola rate
       post is string name of post which we need cola rate
       postconditions: returns promise, which when resolved returns object with 
       id, country, post, and allowance as data members
       description:
    */
    get_cola_rate: function (country, post) {
	return new Promise((resolve, reject) => {
	    const sql = `SELECT * FROM COLARates WHERE country=? AND post=?`;
	    const values = [country, post];
	    queryDB(sql, values, mysql)
		.then(res => resolve(res))
		.catch(err => console.log(err))
	})

    },
    /* name: update_cola_rate
       preconditions: COLARate_id is is of corresponding post/country needing update
       new_allowance is new allowance obtained by scraping webpage
       postconditions: COLARate.id has been updated with new_allowance
       description:
    */
    update_cola_rate: function (COLARate_id, new_allowance) {
	return new Promise((resolve, reject) => {
	    const sql = `UPDATE COLARates SET allowance=? WHERE id=?`
	    const values = [new_allowance, COLARate_id];
	    queryDB(sql, values, mysql)
		.then(res => resolve(res))
		.catch(err => console.log(err))
	});
    },
    /* name: get_users_subsribed_to_post
       preconditions: post is name of post in db
                      country is name of country that corresponds to post
       postconditions: return list of users subscribed to post, along with
                       the template file for each user.
    */
    get_users_subscribed_to_post: function (post, country) {
	return new Promise((resolve, reject) => {
	    const sql = `SELECT u.email as username, t.file, t.name AS filename FROM user u INNER JOIN subscription s ON  u.id=s.userId INNER JOIN COLARates_subscription cs ON s.id=cs.subscriptionId INNER JOIN COLARates c ON cs.COLARatesId=c.id INNER JOIN template t ON s.templateId=t.id WHERE c.post=? AND c.country=?`;
	    const values = [post, country];
	    queryDB(sql, values, mysql)
		.then(res => resolve(res))
		.catch(err => console.log(err))
	});
    },
    /*******************************************************************/
    /******************* END  COLA RATE SCRIPT QUERIES *****************/
    /*******************************************************************/


    /*******************************************************************/
    /********************* SUBSCRIPTION PAGE QUERIES *******************/
    /*******************************************************************/
    /* name: get_list_of_posts
       preconditions: None 
       postconditions:  return Promise that returns list of posts when
                        fulfilled
    */
    get_list_of_posts: function () {
	return new Promise((resolve, reject) => {
	    const sql = `SELECT * FROM COLARates`;
	    const values = [];
	    queryDB(sql, values, mysql)
		.then(res => resolve(res))
		.catch(err => console.log(err))
	});
    },
    /* name: get_user_subscription_list
       preconditions: user_id is current logged in user, which should be
                      obtained from open sesssion.
       postconditions:  return Promise that returns list of user's 
                        subscription when fulfilled
    */
    get_user_subscription_list: function (user_id) {
	return new Promise((resolve, reject) => {
	    const sql = `SELECT cr.post, cr.country, cr.allowance, cr.last_modified, s.id AS subscriptionId, s.name, s.comment
FROM user u
INNER JOIN subscription s ON u.id=s.userId
INNER JOIN COLARates_subscription crs ON s.id=crs.subscriptionId
INNER JOIN COLARates cr ON crs.COLARatesId=cr.id
WHERE u.id=?`;
	    const values = [user_id];
	    queryDB(sql, values, mysql)
		.then(res => resolve(res))
		.catch(err => console.log(err))
	});
    },
    /* name: get_user_template_names
       preconditions: user_id is current logged in user, which should be
       obtained from open sesssion.
       postconditions:  return Promise that returns names and ids of all user's
                        uploaded templates, plus the default system template.
    */
    get_user_template_names: function (user_id) {
	return new Promise((resolve, reject) => {
	    const sql = `SELECT t.id, t.name, t.comment 
FROM user u
INNER JOIN template t ON u.id=t.userId 
WHERE u.id=?`;
	    const values = [user_id];
	    queryDB(sql, values, mysql)
		.then(res => resolve(res))
		.catch(err => console.log(err))
	});
    },
    /* name: get_user_email
       preconditions: user_id is current logged in user, which should be
                      obtained from open sesssion.
       postconditions:  return Promise that returns email that corresponds
                        to user_id in user table.
    */
    get_user_email: function (user_id) {
	return new Promise((resolve, reject) => {
	    const sql = `SELECT email FROM user WHERE id=?`;
	    const values = [user_id];
	    queryDB(sql, values, mysql)
		.then(res => resolve(res))
		.catch(err => console.log(err))
	});
    }
	
	

    /*******************************************************************/
    /****************** END SUBSCRIPTION PAGE QUERIES ******************/
    /*******************************************************************/
}
passport.serializeUser(function (user_id, done) {
	done(null, user_id);
});


passport.deserializeUser(function (user_id, done) {
	done(null, user_id);
});

passport.use(new LocalStrategy(
    function(username, password, done) {
	var sql="SELECT id, password FROM USER WHERE email= ?"
	values=[username]
	queryDB(sql, values, mysql).then((message) => {
	    console.log(message);
	    if (message.length==0){console.log("wrong keyword entry"); return done(null, false)};
	    const hash=message[0].password.toString();
	    bcrypt.compare(password, hash, function(err, response)
			   {
			       if (response==true)
				   return done(null, {user_id: message[0].id});
			       else
				   return done(null, false);	
			   });
	})
	
	
    }));
