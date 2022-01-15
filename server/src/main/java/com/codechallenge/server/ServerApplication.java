package com.codechallenge.server;

import java.util.Properties;
import java.io.FileInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.File;

import java.net.URL;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.util.ResourceUtils;

@SpringBootApplication
public class ServerApplication {

	public static void main(String[] args) {
    Properties properties = new Properties();

    try {
      InputStream istream = ResourceUtils.getURL("classpath:config.properties").openStream();
      properties.load(istream);
    } catch (Exception ex) {
      ex.printStackTrace();
    }

    // Run RESTful Service
		SpringApplication.run(ServerApplication.class, args);
	}
}
